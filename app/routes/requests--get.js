import Boom from 'boom';
import Joi from 'joi';
import _ from 'lodash';

import Request from '../models/request-model';
import Task from '../models/task-model';

const requestStatus = ['open', 'closed', 'canceled'];

module.exports = [
  {
    /* Get all requests */
    method: 'GET',
    path: '/requests',
    config: {
      auth: false,
      validate: {
        query: {
          page: Joi.number(),
          limit: Joi.number(),
          author: Joi.string(),
          status: Joi.alternatives(
            Joi.array().items(Joi.string().valid(requestStatus)),
            Joi.string().valid(requestStatus)
          )
        }
      }
    },
    handler: (req, reply) => {
      let skip = (req.page - 1) * req.limit;

      // Filters.
      let filters = {};
      if (req.query.status) {
        let status = !_.isArray(req.query.status) ? [req.query.status] : req.query.status;
        filters.status = { $in: status };
      }
      if (req.query.author) {
        filters.authorId = req.query.author;
      }

      Promise.all([
        Request.count(filters),
        Request.find(filters).skip(skip).limit(req.limit).exec()
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
          });
      })
      .then(results => {
        req.count = results[0];
        reply(results[1]);
      })
      .catch(err => reply(Boom.badImplementation(err)));
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
          if (!request) throw Boom.notFound();

          return Task.find({requestId: request._id}, {status: true})
            .then(tasks => {
              request = request.toObject();
              request.tasksInfo = {
                total: tasks.length,
                status: _.countBy(tasks, 'status')
              };
              return request;
            });
        })
        .then(request => reply(request))
        .catch(err => reply(Boom.wrap(err)));
    }
  }
];
