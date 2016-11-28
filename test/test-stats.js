'use strict';
import test from 'ava';

import config from '../app/config';
import Server from '../app/services/server';
import {createRequest, rid, connectDb, dropDb} from './utils/utils';

var options = {
  connection: {port: 2000, host: '0.0.0.0'},
  db: config.mongo.testUri
};

var instance = Server(options).hapi;

test.before(t => {
  instance.register(require('inject-then'), function (err) {
    if (err) throw err;
  });

  return connectDb(config.mongo.testUri)
    .then(() => {
      return Promise.all([
        createRequest({
          _id: rid(1),
          authorId: 'coordinator-userid',
          name: 'test request 1',
          status: 'open'
        }),
        createRequest({
          _id: rid(2),
          authorId: 'coordinator-userid',
          name: 'test request 2',
          status: 'open'
        }),
        createRequest({
          _id: rid(3),
          authorId: 'coordinator-userid',
          name: 'test request 3',
          status: 'closed'
        })
      ]);
    });
});

test.after.always(t => {
  return dropDb();
});

//
// GET stats
//

test('GET /stats - get general stats (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/stats`
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var reqStatus = res.result.requests.status;
    t.is(reqStatus.open, 2);
    t.is(reqStatus.closed, 1);
  });
});
