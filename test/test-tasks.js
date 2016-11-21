'use strict';
import test from 'ava';
import mongoose from 'mongoose';

import config from '../app/config';
import Server from '../app/services/server';

import Request from '../app/models/request-model';
import Task from '../app/models/task-model';

function createTask (data) {
  return new Promise((resolve, reject) => {
    var task = new Task(data);
    task.addUpdate(data.authorId, 'open', 'Task was created');
    task.save((err, task) => {
      if (err) reject(err);
      else resolve(task);
    });
  });
}

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
    var rid = '000000000000000000000001';
    var request = new Request({
      _id: rid,
      authorId: 'coordinator-userid',
      name: 'test request',
      status: 'open'
    });

    request.save((err, request) => {
      if (err) throw err;

      Promise.all([
        createTask({_id: '999999999999999999990000', requestId: rid, name: 'task 1', authorId: 'coordinator-userid'}),
        createTask({
          _id: '999999999999999999990001',
          requestId: rid,
          name: 'task 2',
          authorId: 'coordinator-userid',
          assigneeId: 'assigned-surveyor',

          geometry: [[10, 20], [20, 10]],
          deliveryTime: '2016-11-31T00:00:00.000Z',
          timePeriodProvided: {
            from: '2016-11-01T00:00:00.000Z',
            to: '2016-11-21T00:00:00.000Z'
          }
        }),
        createTask({_id: '999999999999999999990002', requestId: rid, name: 'task 3', authorId: 'coordinator-userid'}),
        createTask({_id: '999999999999999999990003', requestId: rid, name: 'task 4', authorId: 'coordinator-userid'})
      ]).then(results => {
        t.end();
      });
    });
  });
});

test.cb.after.always(t => {
  mongoose.connection.db.dropDatabase(t.end);
});

//
// GET

test('GET /requests/{requuid}/tasks - list all request tasks (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: '/requests/000000000000000000000001/tasks'
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.meta !== undefined);
    t.is(results.results.length, 4);
    t.is(results.results[0].name, 'task 1');
  });
});

//
// PATCH

test('PATCH /requests/{requuid}/tasks/{tuuid} - update task (invalid role)', t => {
  return instance.injectThen({
    method: 'PATCH',
    url: '/requests/000000000000000000000001/tasks/999999999999999999990000',
    credentials: {
      user_id: 'test',
      roles: ['invalid']
    },
    payload: {
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('PATCH /requests/{requuid}/tasks/{tuuid} - update task (surveyor role unassigned)', t => {
  return instance.injectThen({
    method: 'PATCH',
    url: '/requests/000000000000000000000001/tasks/999999999999999999990000',
    credentials: {
      user_id: 'test',
      roles: ['invalid']
    },
    payload: {
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('PATCH /requests/{requuid}/tasks/{tuuid} - update task (surveyor role assigned)', t => {
  return instance.injectThen({
    method: 'PATCH',
    url: '/requests/000000000000000000000001/tasks/999999999999999999990001',
    credentials: {
      user_id: 'assigned-surveyor',
      roles: ['surveyor']
    },
    payload: {
      name: 'new name',
      deliveryTime: null,
      timePeriodProvidedFrom: null
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.is(results.name, 'new name');
    t.is(results.deliveryTime, null);
    t.is(results.timePeriodProvided.from, null);
    t.is(results.timePeriodProvided.to, null);
  });
});

test('PATCH /requests/{requuid}/tasks/{tuuid} - update task (coordinator role)', t => {
  return instance.injectThen({
    method: 'PATCH',
    url: '/requests/000000000000000000000001/tasks/999999999999999999990000',
    credentials: {
      user_id: 'assigned-coordinator',
      roles: ['coordinator']
    },
    payload: {
      name: 'new name'
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.is(results.name, 'new name');
  });
});

// Delete
//
// Create
//
// Task updates
//
