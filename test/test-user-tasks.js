'use strict';
import test from 'ava';
import mongoose from 'mongoose';

import config from '../app/config';
import Server from '../app/services/server';
import {createTask, createRequest, rid, tid} from './utils/utils';

var options = {
  connection: {port: 2000, host: '0.0.0.0'},
  db: config.mongo.testUri
};

var instance = Server(options).hapi;

test.cb.before(t => {
  instance.register(require('inject-then'), function (err) {
    if (err) throw err;
  });

  mongoose.connect(config.mongo.testUri);
  mongoose.connection.on('error', function (err) {
    throw err;
  });

  mongoose.connection.once('open', () => {
    var reqId = rid(1);

    var allTasks = Promise.all([
      createTask({_id: tid(1), requestId: reqId, name: 'task 1', status: 'open', authorId: 'coordinator-userid', deliveryTime: '2016-11-30T00:00:00.000Z'}),
      createTask({_id: tid(2), requestId: reqId, name: 'task 2', status: 'open', authorId: 'coordinator-userid', assigneeId: 'assigned-surveyor'}),
      createTask({_id: tid(3), requestId: reqId, name: 'task 3', status: 'completed', authorId: 'coordinator-userid'}),
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

    createRequest({
      _id: reqId,
      authorId: 'coordinator-userid',
      name: 'test request',
      status: 'open'
    })
    .then(request => allTasks)
    .then(results => t.end());
  });
});

test.cb.after.always(t => {
  mongoose.connection.db.dropDatabase(t.end);
});

//
// GET user tasks
//

test('GET /users/{uuid}/tasks - list user tasks (no token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/coordinator-userid/tasks`
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Missing authentication');
  });
});

test('GET /users/{uuid}/tasks - list user tasks (invalid token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/coordinator-userid/tasks`,
    credentials: {
      user_id: 'test',
      roles: ['invalid']
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action');
  });
});

test('GET /users/{uuid}/tasks - list user tasks (surveyor token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/coordinator-userid/tasks`,
    credentials: {
      user_id: 'surveyor',
      roles: ['surveyor']
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
  });
});

test('GET /users/{uuid}/tasks - list user tasks (coordinator token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/coordinator-userid/tasks`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
  });
});

test('GET /users/{uuid}/tasks - list coordinator tasks - default to assigned (coordinator token)', t => {
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
    t.true(results.meta !== undefined);
    t.is(results.results.length, 0);
  });
});

test('GET /users/{uuid}/tasks - list surveyor tasks - assigned (coordinator token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/assigned-surveyor/tasks`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.meta !== undefined);
    t.is(results.results.length, 2);
  });
});

test('GET /users/{uuid}/tasks - list coordinator tasks - created (coordinator token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/coordinator-userid/tasks?scope=created`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.meta !== undefined);
    t.is(results.results.length, 4);
  });
});

test('GET /users/{uuid}/tasks - list user tasks - non existent user (coordinator token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/nouser/tasks?scope=created`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.meta !== undefined);
    t.is(results.results.length, 0);
  });
});

test('GET /users/{uuid}/tasks - list coordinator tasks - created and open (coordinator token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/coordinator-userid/tasks?scope=created&status=open`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.meta !== undefined);
    t.is(results.results.length, 2);
  });
});

test('GET /users/{uuid}/tasks - list coordinator tasks - created and open or completed (coordinator token)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/users/coordinator-userid/tasks?scope=created&status=open&status=completed`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.meta !== undefined);
    t.is(results.results.length, 4);
  });
});
