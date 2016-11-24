import Boom from 'boom';
import Joi from 'joi';
import _ from 'lodash';

import Request from '../models/request-model';
import Task from '../models/task-model';

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

      Promise.all([
        Request.count(),
        Request.find().skip(skip).limit(req.limit).exec()
      ]).then(results => {
        var [count, rawRequests] = results;
        return Promise.all(rawRequests.map(o => Task.find({requestId: o._id}, {status: true}).exec()))
          .then(allReqTasks => {
            // Add the task count to the requests.
            let requests = rawRequests.map((r, i) => {
              // Convert from mongoose model to object.
              r = r.toObject();
              r.tasksInfo = {
                total: allReqTasks[i].length,
                status: _.countBy(allReqTasks[i], 'status')
              };

              return r;
            });

            return [count, requests];
          }).then(results => {
            req.count = results[0];
            reply(results[1]);
          });
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
      Request.findById(req.params.uuid)
        .then(request => {
          if (!request) return reply(Boom.notFound());

          Task.find({requestId: request._id}, {status: true})
            .then(tasks => {
              request = request.toObject();
              request.tasksInfo = {
                total: tasks.length,
                status: _.countBy(tasks, 'status')
              };
              reply(request);
            });
        }).catch(err => reply(Boom.badImplementation(err)));
    }
  }
];
