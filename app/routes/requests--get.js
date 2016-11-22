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
  }
];
