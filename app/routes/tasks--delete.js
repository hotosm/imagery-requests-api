import Boom from 'boom';
import Joi from 'joi';

import Task from '../models/task-model';

module.exports = [
  {
    /* Delete task */
    method: 'DELETE',
    path: '/requests/{requuid}/tasks/{tuuid}',
    config: {
      auth: 'jwt',
      validate: {
        params: {
          requuid: Joi.string().hex(),
          tuuid: Joi.string().hex()
        }
      }
    },
    handler: (req, reply) => {
      const roles = req.auth.credentials && req.auth.credentials.roles || [];

      if (roles.indexOf('coordinator') === -1) {
        return reply(Boom.unauthorized('Not authorized to perform this action'));
      }

      Task.remove({_id: req.params.tuuid})
        .then(res => reply({statusCode: 200, message: 'Task deleted'}))
        .catch(err => reply(Boom.badImplementation(err)));
    }
  }
];
