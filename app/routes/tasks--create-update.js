import Boom from 'boom';
import Joi from 'joi';

import Task from '../models/task-model';

module.exports = [
  {
    /* Create a new task */
    method: 'POST',
    path: '/requests/{requuid}/tasks/{tuuid}/updates',
    config: {
      auth: 'jwt',
      validate: {
        params: {
          requuid: Joi.string().hex(),
          tuuid: Joi.string().hex()
        },
        payload: {
          status: Joi.string().required(),
          comment: Joi.string().required()
        }
      }
    },
    handler: (req, reply) => {
      const roles = req.auth.credentials && req.auth.credentials.roles || [];

      if (roles.indexOf('coordinator') === -1 && roles.indexOf('surveyor') === -1) {
        return reply(Boom.unauthorized('Not authorized to perform this action'));
      }

      const userId = req.auth.credentials.user_id;
      const data = req.payload;

      Task.findById(req.params.tuuid, (err, task) => {
        if (err) return reply(Boom.badImplementation(err));

        if (!task) return reply(Boom.notFound('Task does not exist'));

        if (roles.indexOf('coordinator') === -1 && roles.indexOf('surveyor') !== -1) {
          // Surveyors can make changes if they're assigned to the task.
          if (task.assigneeId !== userId) {
            return reply(Boom.unauthorized('Not authorized to perform this action'));
          }
        }

        task.addUpdate(userId, data.status, data.comment);

        task.save((err, newTask) => {
          if (err) {
            console.error(err);
            return reply(Boom.badImplementation(err));
          }

          return reply(newTask);
        });
      });
    }
  }
];
