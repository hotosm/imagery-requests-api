'use strict';
import test from 'ava';

import config from '../app/config';
import {createRequest, createTask, rid, tid, connectDb, dropDb} from './utils/utils';
import Server from '../app/services/server';

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
          created: '2016-06-01T00:00:00.000Z',
          authorId: 'coordinator',
          name: 'test request 1',
          status: 'open'
        }),
        createRequest({
          _id: rid(2),
          created: '2016-07-01T00:00:00.000Z',
          authorId: 'coordinator',
          name: 'test request 2',
          status: 'open'
        }),
        createRequest({
          _id: rid(3),
          created: '2016-07-01T00:00:00.000Z',
          authorId: 'coordinator',
          name: 'test request 3',
          status: 'open'
        }),

        createTask({
          _id: tid(101),
          requestId: rid(1),
          name: 'task 101',
          deliveryTime: '2017-01-20T00:00:00.000Z'
        }),
        createTask({
          _id: tid(102),
          requestId: rid(1),
          name: 'task 102',
          deliveryTime: '2017-01-10T00:00:00.000Z'
        }),
        createTask({
          _id: tid(103),
          requestId: rid(1),
          name: 'task 103',
          deliveryTime: null
        }),

        createTask({
          _id: tid(201),
          requestId: rid(2),
          name: 'task 201',
          deliveryTime: null
        })
      ]);
    });
});

test.after.always(t => {
  return dropDb();
});

test('GET /requests - next due', t => {
  return instance.injectThen({
    method: 'GET',
    url: '/requests'
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;

    t.is(results.results[0].name, 'test request 1');
    t.is(results.results[0].tasksInfo.nextDue.name, 'task 102');

    t.is(results.results[1].name, 'test request 2');
    t.is(results.results[1].tasksInfo.nextDue, null);

    t.is(results.results[2].name, 'test request 3');
    t.is(results.results[2].tasksInfo.nextDue, null);
  });
});

test('GET /requests/{ruuid} - next due specific request', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/requests/${rid(1)}`
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');

    t.is(res.result.name, 'test request 1');
    t.is(res.result.tasksInfo.nextDue.name, 'task 102');
  });
});

test('GET /requests/{ruuid} - specific request has no next due', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/requests/${rid(2)}`
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');

    t.is(res.result.name, 'test request 2');
    t.is(res.result.tasksInfo.nextDue, null);
  });
});
