import Boom from 'boom';
import Joi from 'joi';

import Request from '../models/request-model';
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

          return Request.findById(task.requestId, {name: true})
            .then(request => {
              task = task.toObject();
              task.requestInfo = {name: request.name};
              task.updates.reverse();
              return task;
            });
        })
        .then(task => reply(task))
        .catch(err => reply(Boom.wrap(err)));
    }
  }
];
