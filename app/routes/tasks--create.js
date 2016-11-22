import Boom from 'boom';
import Joi from 'joi';

import Request from '../models/request-model';
import Task from '../models/task-model';

module.exports = [
  {
    /* Create a new task */
    method: 'POST',
    path: '/requests/{requuid}/tasks',
    config: {
      auth: 'jwt',
      validate: {
        params: {
          requuid: Joi.string().hex()
        },
        payload: {
          name: Joi.string().required(),
          geometry: Joi.array().items(Joi.array()).required(),
          assigneeId: Joi.string(),
          timePeriodProvidedFrom: Joi.alternatives().try(Joi.valid(''), Joi.date()),
          timePeriodProvidedTo: Joi.alternatives().try(Joi.valid(''), Joi.date().min(Joi.ref('timePeriodProvidedFrom'))),
          deliveryTime: Joi.alternatives().try(Joi.valid(''), Joi.date())
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

      Request.findOne({_id: req.params.requuid}, (err, request) => {
        if (err) return reply(Boom.badImplementation(err));

        if (!request) return reply(Boom.notFound('Request does not exist'));

        let task = new Task({
          authorId: userId,
          name: data.name,
          geometry: data.geometry,

          requestId: req.params.requuid,

          assigneeId: data.assigneeId || null,
          deliveryTime: data.deliveryTime || null,

          timePeriodProvided: {
            from: data.timePeriodProvidedFrom || null,
            to: data.timePeriodProvidedTo || null
          }
        });

        task.addUpdate(userId, 'open', 'Task was created');

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
