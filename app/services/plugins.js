'use strict';

module.exports = function (server, cb) {
  server.register([
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
    }
    // Plugin registration done.
  ], (err) => cb(err));
};
