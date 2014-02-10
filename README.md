# Timplan - JSONSchema validation for hapi

Timplan allows you to use JSON schemas instead of joi in hapi. It's still possible to use hapi for validation. So one possible strategy could be to let path and query parameter validation remain in joi, but use schemas for payload and response.

## Example

```javascript
var lib = {
  hapi: require('hapi'),
  yaml: require('yaml'),
  timplan: require('timplan')
};

// Set up a validator
var validator = new lib.timplan.Validator({
  baseUrl: 'http://api.bloglovin.se/schemas/',
  schemaDir: './schemas'
});
// Add the schemas that we will use
validator.addYamlSchema('requests/get-post-1.0.0.schema.yml');
validator.addSchema('post-1.0.0.schema.json');

var server = new lib.hapi.Server('localhost', 8000, { cors: true });

server.route({
  method: 'GET',
  path: '/posts/{id}',
  handler: function serveSampleData(request, reply) {
    var post = require('./docs/schemas/sample/data/post-2305151223.json');
    reply(post);
  },
  config: {
    validate: validator.request('requests/get-post-1.0.0.schema.json'),
    response: {
      schema: validator.response('post-1.0.0.schema.json')
    }
  }
});

server.start(function serverStarted() {
  console.log("We're up and running");
});
```
