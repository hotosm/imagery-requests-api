import Boom from 'boom';
import Joi from 'joi';

import Request from '../models/request-model';

module.exports = [
  {
    /* Update Request */
    method: 'PATCH',
    path: '/requests/{requuid}',
    config: {
      auth: 'jwt',
      validate: {
        params: {
          requuid: Joi.string().hex()
        },
        payload: {
          name: Joi.string(),
          status: Joi.string(),
          requestingOrg: Joi.alternatives().try(Joi.valid(null), Joi.string()),
          gsd: Joi.alternatives().try(Joi.valid(null), Joi.number()),
          productType: Joi.alternatives().try(Joi.valid(null), Joi.string()),
          purpose: Joi.alternatives().try(Joi.valid(null), Joi.string()),
          use: Joi.alternatives().try(Joi.valid(null), Joi.string()),
          notes: Joi.alternatives().try(Joi.valid(null), Joi.string()),
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

      const data = req.payload;

      Request.findById(req.params.requuid, (err, request) => {
        if (err) return reply(Boom.badImplementation(err));

        if (!request) return reply(Boom.notFound('Request does not exist'));

        typeof data.name !== 'undefined' && request.set('name', data.name);
        typeof data.status !== 'undefined' && request.set('status', data.status);
        typeof data.requestingOrg !== 'undefined' && request.set('requestingOrg', data.requestingOrg);
        typeof data.gsd !== 'undefined' && request.set('gsd', data.gsd);
        typeof data.productType !== 'undefined' && request.set('productType', data.productType);
        typeof data.purpose !== 'undefined' && request.set('purpose', data.purpose);
        typeof data.use !== 'undefined' && request.set('use', data.use);
        typeof data.notes !== 'undefined' && request.set('notes', data.notes);

        typeof data.timePeriodRequestedTo !== 'undefined' && request.set('timePeriodRequested.to', data.timePeriodRequestedTo);
        if (typeof data.timePeriodRequestedFrom !== 'undefined') {
          request.set('timePeriodRequested.from', data.timePeriodRequestedFrom);
          if (data.timePeriodRequestedFrom === '' || data.timePeriodRequestedFrom === null) {
            request.set('timePeriodRequested.to', null);
          }
        }

        request.save((err, newRequest) => {
          if (err) {
            console.error(err);
            return reply(Boom.badImplementation(err));
          }

          return reply(newRequest);
        });
      });
    }
  }
];
