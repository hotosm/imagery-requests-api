import Boom from 'boom';
import Joi from 'joi';
import async from 'async';

import Task from '../models/task-model';

module.exports = [
  {
    /* Get all tasks for a request */
    method: 'GET',
    path: '/requests/{requuid}/tasks',
    config: {
      auth: false,
      validate: {
        params: {
          requuid: Joi.string().hex()
        }
      }
    },
    handler: (req, reply) => {
      let skip = (req.page - 1) * req.limit;

      // TODO: Add filters.

      Promise.all([
        Task.count({requestId: req.params.requuid}),
        Task.find({requestId: req.params.requuid}).skip(skip).limit(req.limit).exec()
      ])
      .then(res => {
        req.count = res[0];
        return reply(res[1]);
      })
      .catch(err => reply(Boom.badImplementation(err)));
    }
  }
];
