import Boom from 'boom';
import Joi from 'joi';
import _ from 'lodash';

import Request from '../models/request-model';
import Task from '../models/task-model';
import { getAllUsers } from '../services/auth0-users';

const taskStatus = ['open', 'inprogress', 'completed', 'canceled'];

module.exports = [
  {
    /* Get list of users from auth0 */
    method: 'GET',
    path: '/users',
    config: {
      auth: false
    },
    handler: (req, reply) => {
      getAllUsers().then(data => {
        // Simplify user profiles.
        data = data.map(o => {
          return {
            userId: o.user_id,
            name: _.get(o, 'user_metadata.name', 'n/a'),
            roles: _.get(o, 'app_metadata.roles', [])
          };
        });
        reply(data);
      }).catch(err => reply(Boom.badImplementation(err)));
    }
  },
  {
    /* Get tasks of specific user */
    method: 'GET',
    path: '/users/{uuid}/tasks',
    config: {
      auth: 'jwt',
      validate: {
        params: {
          uuid: Joi.string()
        },
        query: {
          page: Joi.number(),
          limit: Joi.number(),
          scope: Joi.string().valid('created', 'assigned').default('assigned'),
          status: Joi.alternatives(
            Joi.array().items(Joi.string().valid(taskStatus)),
            Joi.string().valid(taskStatus)
          ),
          dateFrom: Joi.date(),
          dateTo: Joi.date().min(Joi.ref('dateFrom'))
        }
      }
    },
    handler: (req, reply) => {
      const roles = req.auth.credentials && req.auth.credentials.roles || [];

      if (roles.indexOf('coordinator') === -1 && roles.indexOf('surveyor') === -1) {
        return reply(Boom.unauthorized('Not authorized to perform this action'));
      }
      const skip = (req.page - 1) * req.limit;

      // Filters.
      let filters = {};
      if (req.query.scope === 'assigned') {
        filters.assigneeId = req.params.uuid;
      } else if (req.query.scope === 'created') {
        filters.authorId = req.params.uuid;
      }
      if (req.query.status) {
        let status = !_.isArray(req.query.status) ? [req.query.status] : req.query.status;
        filters.status = { $in: status };
      }

      if (req.query.dateFrom || req.query.dateTo) {
        filters.created = {};
        if (req.query.dateFrom) {
          filters.created['$gte'] = req.query.dateFrom;
        }
        if (req.query.dateTo) {
          filters.created['$lte'] = req.query.dateTo;
        }
      }

      Promise.all([
        Task.count(filters),
        Task.find(filters).skip(skip).limit(req.limit).exec()
      ])
      .then(results => {
        var [count, rawTasks] = results;
        // Array of request ids to get.
        let uniqueReqIds = _.uniq(_.map(rawTasks, 'requestId'));

        // Get all the requests these tasks belong to and get their name.
        return Request.find({_id: {$in: uniqueReqIds}}, {name: true})
          .then(requests => {
            let tasks = rawTasks.map(t => {
              let r = _.find(requests, o => o._id.equals(t.requestId));

              if (!r) {
                throw new Error(`Request (${t.requestId}) not found for task (${t._id})`);
              }

              // Mongoose object to plain object to allow adding properties.
              t = t.toObject();
              t.requestInfo = {name: r.name};
              return t;
            });

            return [count, tasks];
          });
      })
      .then(results => {
        req.count = results[0];
        reply(results[1]);
      })
      .catch(err => reply(Boom.badImplementation(err)));
    }
  }
];
