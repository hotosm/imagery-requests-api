import Boom from 'boom';
import Joi from 'joi';
import async from 'async';

import Request from '../models/request-model';

module.exports = [
  {
    /* Get all requests */
    method: 'GET',
    path: '/requests',
    config: {
      auth: false
    },
    handler: (req, reply) => {
      let skip = (req.page - 1) * req.limit;

      // TODO: Add filters.

      async.parallel([
        (cb) => Request.count(cb),
        (cb) => Request.find().skip(skip).limit(req.limit).exec(cb)
      ], (err, res) => {
        if (err) {
          return reply(Boom.badImplementation(err));
        }

        req.count = res[0];
        return reply(res[1]);
      });
    }
  },

  {
    /* Get a request */
    method: 'GET',
    path: '/requests/{uuid}',
    config: {
      auth: false,
      validate: {
        params: {
          uuid: Joi.string().hex()
        }
      }
    },
    handler: (req, reply) => {
      Request.findOne({_id: req.params.uuid}, (err, request) => {
        if (err) return reply(Boom.badImplementation(err));

        if (!request) return reply(Boom.notFound());

        reply(request);
      });
    }
  },

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
          timePeriodRequestedFrom: Joi.alternatives().try(Joi.valid(''), Joi.date()),
          timePeriodRequestedTo: Joi.alternatives().try(Joi.valid(''), Joi.date().min(Joi.ref('timePeriodRequestedFrom')))
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

      request.save((err, newRequest) => {
        if (err) {
          console.error(err);
          return reply(Boom.badImplementation(err));
        }

        return reply(newRequest);
      });
    }
  },

  {
    /* Get a request */
    method: 'DELETE',
    path: '/requests/{uuid}',
    config: {
      auth: 'jwt',
      validate: {
        params: {
          uuid: Joi.string().hex()
        }
      }
    },
    handler: (req, reply) => {
      const roles = req.auth.credentials && req.auth.credentials.roles || [];

      if (roles.indexOf('coordinator') === -1) {
        return reply(Boom.unauthorized('Not authorized to perform this action'));
      }

      // TODO: Remove tasks of this request

      Request.remove({_id: req.params.uuid}, (err) => {
        if (err) return reply(Boom.badImplementation(err));

        reply({statusCode: 200, message: 'Request deleted'});
      });
    }
  }
];
