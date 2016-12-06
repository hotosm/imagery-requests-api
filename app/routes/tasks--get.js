import Boom from 'boom';
import Joi from 'joi';

import { attachRequestInfoToTask } from '../utils/utils';
import Task from '../models/task-model';

module.exports = [
  {
    /* Get a specific task */
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
      Task.findById(req.params.tuuid)
        .then(task => {
          if (!task) throw Boom.notFound();

          return attachRequestInfoToTask(task);
        })
        .then(task => {
          task.updates.reverse();
          return reply(task);
        })
        .catch(err => reply(Boom.wrap(err)));
    }
  }
];
