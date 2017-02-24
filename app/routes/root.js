'use strict';
import Boom from 'boom';
import _ from 'lodash';

import Request from '../models/request-model';

module.exports = [
  {
    path: '/',
    method: 'GET',
    config: {
      auth: false
    },
    handler: (request, reply) => {
      reply({
        statusCode: 200,
        message: 'Welcome to the Imagery Coordination API. See https://github.com/hotosm/imagery-requests-api for documentation.'
      });
    }
  },
  {
    path: '/stats',
    method: 'GET',
    config: {
      auth: false
    },
    handler: (req, reply) => {
      Request.aggregate({$group: {_id: '$status', count: {$sum: 1}}})
        .then(res => {
          let data = {
            requests: {
              status: {
                open: _.get(_.find(res, {_id: 'open'}), 'count', 0),
                closed: _.get(_.find(res, {_id: 'closed'}), 'count', 0)
              }
            }
          };
          reply(data);
        })
        .catch(err => reply(Boom.wrap(err)));
    }
  }
];
