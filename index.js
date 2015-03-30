/* jshint node: true */
'use strict';

var mod_url = require('url');
var mod_path = require('path');
var mod_fs = require('fs');
var mod_jsonschema = require('jsonschema');
var mod_yaml = require('js-yaml');
var mod_coercions = require('./lib/coercions');

var VError = require('verror');

function Validator(options) {
  options = options || {};
  this.baseUrl = options.baseUrl;
  this.schemaDir = mod_path.resolve(options.schemaDir || '.');

  this.validator = new mod_jsonschema.Validator();

  this.coerceType = function (instance, property, schema, options, ctx) {
    var value = instance[property];

    // Skip nulls and undefineds
    if (value === null || typeof value === 'undefined') {
      return;
    }

    // If the schema declares a type and the property fails type validation.
    if (schema.type && this.attributes.type.call(this, instance, schema, options, ctx.makeChild(schema, property))) {
      var types = (schema.type instanceof Array) ? schema.type : [schema.type];
      var coerced;

      // Go through the declared types until we find something that we can
      // coerce the value into.
      for (var i = 0; coerced === undefined && i < types.length; i++) {
        // If we support coercion to this type
        if (mod_coercions[types[i]]) {
          // ...attempt it.
          coerced = mod_coercions[types[i]](value);
        }
      }
      // If we got a successful coercion we modify the property of the instance.
      if (coerced !== undefined) {
        instance[property] = coerced;
      }
    }
  }.bind(this.validator);
}

Validator.prototype.addSchema = function (path) {
  var resolvedPath = mod_path.resolve(this.schemaDir, path);
  if (mod_fs.existsSync(resolvedPath)) {
    var schema = require(resolvedPath);
    this.validator.addSchema(schema);
  }
  else {
    throw new Error('There is no schema file at "' + resolvedPath + '"');
  }
};

Validator.prototype.getSchema = function (uri) {
  // Remove fragment
  var base = uri.replace(/#.*$/, '');
  return this.validator.schemas[base];
};

Validator.prototype.addYamlSchema = function (path) {
  var resolvedPath = mod_path.resolve(this.schemaDir, path);
  if (mod_fs.existsSync(resolvedPath)) {
    var source = mod_fs.readFileSync(resolvedPath, {encoding:'utf8'});
    try {
      var schema = mod_yaml.safeLoad(source);
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
  uri = mod_url.resolve(this.baseUrl, uri);
  var schema = this.validator.schemas[uri];

  if (!schema) {
    throw new Error('Unknown schema ' + uri);
  }

  if (schema.definitions.path || schema.definitions.params) {
    var definition = schema.definitions.params ? 'params' : 'path';
    validate.params = this.params(uri, definition);
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
  return this.params(uri, 'path');
};

Validator.prototype.params = function (uri, definition) {
  return this.schema(uri, {
    definition: definition,
    propertyName: 'params',
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
    propertyName: 'payload',
    coerce: true
  });
};

Validator.prototype.response = function(uri) {
  return this.schema(uri, {
    propertyName: 'response',
    coerce: true
  });
};

Validator.prototype.schema = function (uri, options) {
  var validation = {
    propertyName: options.propertyName || options.definition,
    preValidateProperty: options.coerce ? this.coerceType : null,
  };
  validation.schema = this.baseUrl ? mod_url.resolve(this.baseUrl, uri) : uri;
  if (options.definition) {
    validation.schema += '#/definitions/' + options.definition;
  }

  var func = this.validate.bind(this, validation);
  func.uri = validation.schema;
  return func;
};

Validator.prototype.context = function (baseUrl, schemaDir) {
  return Object.create(this, {
    baseUrl: {value: baseUrl},
    schemaDir: {value: schemaDir}
  });
};

Validator.prototype.validate = function (validation, object, options, callback) {
  var schema = {
    type: 'object',
    '$ref': validation.schema
  };

  var error = null;
  var result;

  try {
    result = this.validator.validate(object, schema, {
      propertyName: validation.propertyName,
      preValidateProperty: validation.preValidateProperty
    });
  } catch (err) {
    error = new VError(err, 'Failed to validate');
  }

  if (!error && result.errors.length) {
    error = new Error('Failed validation: ' + result.errors.map(function stacks(error) {
      return error.stack;
    }).join(', '));
  }

  callback(error);
};

// Register hapi plugin
exports.register = function (server, options, next) {
  server.expose('validator', new Validator(options));
  next();
};
exports.register.attributes = {
  pkg: require('./package.json'),
};

exports.Validator = Validator;
