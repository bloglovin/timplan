/* jshint node: true */
'use strict';

var lib = {
  url: require('url'),
  path: require('path'),
  fs: require('fs'),
  jsonschema: require('jsonschema'),
  yaml: require('js-yaml'),
  coercions: require('./lib/coercions')
};

function Validator(options) {
  options = options || {};

  this.baseUrl = options.baseUrl;
  this.schemaDir = lib.path.resolve(options.schemaDir || '.');

  this.validator = new lib.jsonschema.Validator();

  this.coerceType = function (instance, property, schema, options, ctx) {
    var value = instance[property];

    // Skip nulls and undefineds
    if (value === null || typeof value == 'undefined') {
      return;
    }

    // If the schema declares a type and the property fails type validation.
    if (schema.type && this.attributes.type.call(this, instance, schema, options, ctx.makeChild(schema, property))) {
      var types = (schema.type instanceof Array) ? schema.type : [schema.type];
      var coerced;

      // Go through the declared types until we find something that we can
      // coerce the value into.
      for (var i = 0; typeof coerced == 'undefined' && i < types.length; i++) {
        // If we support coercion to this type
        if (lib.coercions[types[i]]) {
          // ...attempt it.
          coerced = lib.coercions[types[i]](value);
        }
      }
      // If we got a successful coercion we modify the property of the instance.
      if (typeof coerced != 'undefined') {
        instance[property] = coerced;
      }
    }
  }.bind(this.validator);
}

Validator.prototype.addSchema = function (path) {
  var resolvedPath = lib.path.resolve(this.schemaDir, path);
  if (lib.fs.existsSync(resolvedPath)) {
    var schema = require(resolvedPath);
    this.validator.addSchema(schema);
  }
  else {
    throw new Error('There is no schema file at "' + resolvedPath + '"');
  }
};

Validator.prototype.addYamlSchema = function (path) {
  var resolvedPath = lib.path.resolve(this.schemaDir, path);
  if (lib.fs.existsSync(resolvedPath)) {
    var source = lib.fs.readFileSync(resolvedPath, {encoding:'utf8'});
    try {
      var schema = lib.yaml.safeLoad(source);
      this.validator.addSchema(schema);
    } catch (parseError) {
      throw new Error('Failed to parse yaml schema: ' + parseError.message);
    }
  }
  else {
    throw new Error('There is no schema file at "' + resolvedPath + '"');
  }
};

Validator.prototype.request = function (uri) {
  var validate = {};
  uri = lib.url.resolve(this.baseUrl, uri);
  var schema = this.validator.schemas[uri];

  if (!schema) {
    throw new Error('Unknown schema ' + uri);
  }

  if (schema.definitions.path) {
    validate.path = this.path(uri);
  }
  if (schema.definitions.query) {
    validate.query = this.query(uri);
  }
  if (schema.definitions.payload) {
    validate.payload = this.payload(uri);
  }

  return validate;
};

Validator.prototype.path = function (uri) {
  return this.schema(uri, {
    definition: 'path',
    propertyName: 'path',
    coerce: true
  });
};

Validator.prototype.query = function (uri) {
  return this.schema(uri, {
    definition: 'query',
    propertyName: 'query',
    coerce: true
  });
};

Validator.prototype.payload = function (uri) {
  return this.schema(uri, {
    definition: 'payload',
    propertyName: 'payload'
  });
};

Validator.prototype.response = function(uri) {
  return this.schema(uri, {
    propertyName: 'response',
    severity: 'warn'
  });
};

Validator.prototype.schema = function (uri, options) {
  var validation = {
    propertyName: options.propertyName || options.definition,
    preValidateProperty: options.coerce ? this.coerceType : null,
    severity: options.severity || 'error'
  };
  validation.schema = this.baseUrl ? lib.url.resolve(this.baseUrl, uri) : uri;
  if (options.definition) {
    validation.schema += '#/definitions/' + options.definition;
  }
  validation.validate = this.validate.bind(this, validation);

  return validation;
};

Validator.prototype.context = function (baseUrl, schemaDir) {
  return Object.create(this, {
    baseUrl: {value: baseUrl},
    schemaDir: {value: schemaDir}
  });
};

Validator.prototype.validate = function (validation, object, options) {
  var schema = {
    type: 'object',
    '$ref': validation.schema
  };

  var result = this.validator.validate(object, schema, {
    propertyName: validation.propertyName,
    preValidateProperty: validation.preValidateProperty
  });

  var error = null;
  if (result.errors.length) {
    error = new Error('Failed validation: ' + result.errors.map(function stacks(error) {
      return error.stack;
    }).join(', '));
  }

  // Let validation errors slide if the severity level is 'warn'
  if (error && validation.severity == 'warn') {
    console.error(validation.propertyName, 'failed validation:', error.message, 'Schema:', validation.schema);
    error = null;
  }

  return error;
};

exports.Validator = Validator;
