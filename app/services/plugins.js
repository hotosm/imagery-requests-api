'use strict';
import config from '../config';

module.exports = function (hapiServer, cb) {
  hapiServer.register(require('hapi-auth-jwt2'), function (err) {
    if (err) return cb(err);

    hapiServer.auth.strategy('jwt', 'jwt', {
      key: new Buffer(config.auth0.secret, 'base64'),
      validateFunc: function (decoded, request, callback) {
        if (decoded) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      verifyOptions: {
        algorithms: ['HS256'],
        audience: config.auth0.clientId
      }
    });

    hapiServer.auth.default('jwt');

    // These plugins must be registered after the auth one.
    hapiServer.register([
      // Good console.
      {
        register: require('good'),
        options: {
          reporters: {
            console: [
              {
                module: 'good-squeeze',
                name: 'Squeeze',
                args: [{
                  response: '*',
                  log: '*'
                }]
              },
              {
                module: 'good-console'
              }, 'stdout']
          }
        }
      },

      // Route loader
      {
        register: require('hapi-router'),
        options: {
          routes: 'app/routes/*.js'
        }
      },

      // Pagination
      {
        register: require('hapi-paginate'),
        options: {
          limit: 100,
          routes: [
            '/requests',
            '/requests/{requuid}/tasks'
          ]
        }
      }
      // Plugin registration done.
    ], (err) => cb(err));
  });
};
