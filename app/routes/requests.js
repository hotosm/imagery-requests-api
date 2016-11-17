const Boom = require('boom');

module.exports = [
  {
    /* Create a new requests */
    method: 'POST',
    path: '/requests',
    config: { auth: 'jwt' },
    handler: (request, reply) => {
      reply({status: 'request created'});
    }
  }
];
