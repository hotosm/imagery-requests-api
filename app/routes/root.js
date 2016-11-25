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
        message: 'In the beginning the Universe was created. This has made a lot of people very angry and been widely regarded as a bad move.'
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
