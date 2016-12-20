'use strict';
import test from 'ava';

import config from '../app/config';
import Server from '../app/services/server';
import {createTask, createRequest, rid, tid, connectDb, dropDb} from './utils/utils';

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
      var reqId = rid(1);

      var allTasks = Promise.all([
        createTask({_id: tid(1), requestId: reqId, name: 'task 1', status: 'open', authorId: 'coordinator-userid', deliveryTime: '2016-11-30T00:00:00.000Z'}),
        createTask({_id: tid(2), requestId: reqId, name: 'task 2', status: 'open', authorId: 'coordinator-userid', assigneeId: 'assigned-surveyor'}),
        createTask({_id: tid(3), requestId: reqId, name: 'task 3', status: 'completed', authorId: 'coordinator-userid', assigneeId: 'coordinator-userid'}),
        createTask({
          _id: tid(4),
          requestId: reqId,
          name: 'task 4',
          status: 'completed',
          authorId: 'coordinator-userid',
          assigneeId: 'assigned-surveyor',

          geometry: [[10, 20], [20, 10]],
          deliveryTime: '2016-11-30T00:00:00.000Z',
          timePeriodProvided: {
            from: '2016-11-01T00:00:00.000Z',
            to: '2016-11-21T00:00:00.000Z'
          }
        })
      ]);

      return createRequest({
        _id: reqId,
        authorId: 'coordinator-userid',
        name: 'test request',
        status: 'open'
      })
      .then(request => allTasks);
    });
});

test.after.always(t => {
  return dropDb();
});

//
// GET user tasks stats
//

test('GET /users/{uuid}/tasks - list coordinator tasks stats - default no stats (coordinator token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/coordinator-userid/tasks`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.stats === undefined);
  });
});

test('GET /users/{uuid}/tasks - list coordinator tasks stats - scope assigned (coordinator token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/coordinator-userid/tasks?scope=assigned&includeStats=true`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.is(results.results.length, 1);
    t.is(results.stats.activeTasks, 2);
    t.is(results.stats.completeTasks, 2);
  });
});

test('GET /users/{uuid}/tasks - list coordinator tasks stats - scope created (coordinator token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/coordinator-userid/tasks?scope=created&includeStats=true`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.is(results.results.length, 4);
    t.is(results.stats.activeTasks, 2);
    t.is(results.stats.completeTasks, 2);
  });
});

test('GET /users/{uuid}/tasks - list surveyor tasks stats - scope assigned (surveyor token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/assigned-surveyor/tasks?scope=assigned&includeStats=true`,
    credentials: {
      user_id: 'surveyor',
      roles: ['surveyor']
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.is(results.results.length, 2);
    t.is(results.stats.activeTasks, 1);
    t.is(results.stats.completeTasks, 1);
  });
});

test('GET /users/{uuid}/tasks - list surveyor tasks stats - scope created (surveyor token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/assigned-surveyor/tasks?scope=created&includeStats=true`,
    credentials: {
      user_id: 'surveyor',
      roles: ['surveyor']
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    console.log('results', results);
    t.is(results.results.length, 0);
    t.is(results.stats.activeTasks, 1);
    t.is(results.stats.completeTasks, 1);
  });
});
