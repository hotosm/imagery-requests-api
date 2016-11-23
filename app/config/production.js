'use strict';
module.exports = {
  environment: 'production',
  connection: {
    host: '0.0.0.0',
    port: 4000
  },
  mongo: {
    uri: null,
    testUri: null
  },

  auth0: {
    secret: null,
    clientId: null,
    api: null,
    manageToken: null
  }
};
