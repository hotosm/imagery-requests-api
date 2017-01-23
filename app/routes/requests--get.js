import Boom from 'boom';
import Joi from 'joi';
import _ from 'lodash';

import Request from '../models/request-model';
import Task from '../models/task-model';
import { polygon, featureCollection } from '@turf/helpers';
import envelope from '@turf/envelope';

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
          ),
          dateFrom: Joi.date(),
          dateTo: Joi.date().min(Joi.ref('dateFrom')),
          footprint: Joi.boolean().truthy('true').falsy('false')
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
        Request.count(filters),
        Request.find(filters).skip(skip).limit(req.limit).exec()
      ]).then(results => {
        var [count, rawRequests] = results;
        return Promise.all(rawRequests.map(o => Task.find({requestId: o._id}, {status: true, geometry: true}).exec()))
          .then(allReqTasks => {
            // Add the task count to the requests.
            let requests = rawRequests.map((r, i) => {
              let reqTasks = allReqTasks[i];
              // Convert from mongoose model to object.
              r = r.toObject();

              if (req.query.footprint) {
                let tasksWithGeo = reqTasks.filter(task => task.geometry !== null);
                if (tasksWithGeo.length) {
                  let fc = featureCollection(tasksWithGeo.map(task => polygon([task.geometry])));
                  r.footprint = envelope(fc);
                } else {
                  r.footprint = null;
                }
              }

              r.tasksInfo = {
                total: reqTasks.length,
                status: _.countBy(reqTasks, 'status')
              };

              return r;
            });

            return [count, requests];
          });
      })
      .then(results => {
        var [count, requests] = results;
        let fields = {
          created: 1,
          updated: 1,
          authorId: 1,
          name: 1,
          status: 1,
          requestId: 1,
          assigneeId: 1,
          deliveryTime: 1
        };

        return Promise.all(requests.map(o => Task
            .findOne({requestId: o._id, deliveryTime: {'$ne': null}}, fields)
            .sort({deliveryTime: 1})
            .exec())
          )
          .then(reqTasksNextDue => {
            requests = requests.map((r, i) => {
              r.tasksInfo.nextDue = reqTasksNextDue[i];
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
        },
        query: {
          footprint: Joi.boolean().truthy('true').falsy('false')
        }
      }
    },
    handler: (req, reply) => {
      Request.findById(req.params.uuid)
        .then(request => {
          if (!request) throw Boom.notFound();

          return Task.find({requestId: request._id}, {status: true, geometry: true})
            .then(tasks => {
              request = request.toObject();
              if (req.query.footprint) {
                let tasksWithGeo = tasks.filter(task => task.geometry !== null);
                if (tasksWithGeo.length) {
                  let fc = featureCollection(tasksWithGeo.map(task => polygon([task.geometry])));
                  request.footprint = envelope(fc);
                } else {
                  request.footprint = null;
                }
              }
              request.tasksInfo = {
                total: tasks.length,
                status: _.countBy(tasks, 'status')
              };
              return request;
            });
        })
        .then(request => {
          let fields = {
            created: 1,
            updated: 1,
            authorId: 1,
            name: 1,
            status: 1,
            requestId: 1,
            assigneeId: 1,
            deliveryTime: 1
          };

          return Task
            .findOne({requestId: request._id, deliveryTime: {'$ne': null}}, fields)
            .sort({deliveryTime: 1})
            .exec()
            .then(reqTaskNextDue => {
              request.tasksInfo.nextDue = reqTaskNextDue;
              return request;
            });
        })
        .then(request => reply(request))
        .catch(err => reply(Boom.wrap(err)));
    }
  }
];
