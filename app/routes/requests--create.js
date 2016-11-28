import Boom from 'boom';
import Joi from 'joi';

import Request from '../models/request-model';

module.exports = [
  {
    /* Create a new requests */
    method: 'POST',
    path: '/requests',
    config: {
      auth: 'jwt',
      validate: {
        payload: {
          name: Joi.string().required(),
          status: Joi.string(),
          requestingOrg: Joi.string(),
          gsd: Joi.number(),
          productType: Joi.string(),
          purpose: Joi.string(),
          use: Joi.string(),
          notes: Joi.string(),
          timePeriodRequestedFrom: Joi.alternatives().try(Joi.valid(null), Joi.date()),
          timePeriodRequestedTo: Joi.alternatives().try(Joi.valid(null), Joi.date().min(Joi.ref('timePeriodRequestedFrom')))
        }
      }
    },
    handler: (req, reply) => {
      const roles = req.auth.credentials && req.auth.credentials.roles || [];

      if (roles.indexOf('coordinator') === -1) {
        return reply(Boom.unauthorized('Not authorized to perform this action'));
      }

      const userId = req.auth.credentials.user_id;
      const data = req.payload;

      let request = new Request({
        authorId: userId,
        name: data.name,
        status: 'open',

        requestingOrg: data.requestingOrg || null,
        gsd: data.gsd || null,
        productType: data.productType || null,

        timePeriodRequested: {
          from: data.timePeriodRequestedFrom || null,
          to: data.timePeriodRequestedTo || null
        },

        purpose: data.purpose || null,
        use: data.use || null,
        notes: data.notes || null
      });

      request.save()
        .then(newRequest => reply(newRequest))
        .catch(err => {
          console.error(err);
          return reply(Boom.badImplementation(err));
        });
    }
  }
];
