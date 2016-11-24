import Boom from 'boom';
import Joi from 'joi';

import Task from '../models/task-model';

module.exports = [
  {
    /* Update task */
    method: 'PATCH',
    path: '/requests/{requuid}/tasks/{tuuid}',
    config: {
      auth: 'jwt',
      validate: {
        params: {
          requuid: Joi.string().hex(),
          tuuid: Joi.string().hex()
        },
        payload: {
          name: Joi.string(),
          assigneeId: Joi.alternatives().try(Joi.valid(null), Joi.string()),
          timePeriodProvidedFrom: Joi.alternatives().try(Joi.valid(null), Joi.date()),
          timePeriodProvidedTo: Joi.alternatives().try(Joi.valid(null), Joi.date().min(Joi.ref('timePeriodProvidedFrom'))),
          geometry: Joi.array().items(Joi.array()),
          deliveryTime: Joi.alternatives().try(Joi.valid(null), Joi.date())
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

        typeof data.name !== 'undefined' && task.set('name', data.name);
        typeof data.assigneeId !== 'undefined' && task.set('assigneeId', data.assigneeId);
        typeof data.geometry !== 'undefined' && task.set('geometry', data.geometry);
        typeof data.deliveryTime !== 'undefined' && task.set('deliveryTime', data.deliveryTime);

        typeof data.timePeriodProvidedTo !== 'undefined' && task.set('timePeriodProvided.to', data.timePeriodProvidedTo);
        if (typeof data.timePeriodProvidedFrom !== 'undefined') {
          task.set('timePeriodProvided.from', data.timePeriodProvidedFrom);
          if (data.timePeriodProvidedFrom === '' || data.timePeriodProvidedFrom === null) {
            task.set('timePeriodProvided.to', null);
          }
        }

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
