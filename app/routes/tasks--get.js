import Boom from 'boom';
import Joi from 'joi';

import Task from '../models/task-model';

module.exports = [
  {
    /* Get all tasks for a request */
    method: 'GET',
    path: '/requests/{requuid}/tasks/{tuuid}',
    config: {
      auth: false,
      validate: {
        params: {
          requuid: Joi.string().hex(),
          tuuid: Joi.string().hex()
        }
      }
    },
    handler: (req, reply) => {
      Task.findOne({_id: req.params.tuuid}, (err, task) => {
        if (err) return reply(Boom.badImplementation(err));

        if (!task) return reply(Boom.notFound());

        reply(task);
      });
    }
  }
];
