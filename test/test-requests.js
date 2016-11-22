'use strict';
import test from 'ava';
import mongoose from 'mongoose';

import config from '../app/config';
import {createRequest, createTask, rid, tid} from './utils/utils';
import Server from '../app/services/server';

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
    Promise.all([
      createRequest({
        _id: rid(1),
        authorId: 'coordinator',
        name: 'test request 1',
        status: 'open'
      }),
      createRequest({
        _id: rid(2),
        authorId: 'coordinator',
        name: 'test request 2',
        status: 'open'
      }),
      createRequest({
        _id: rid(3),
        authorId: 'coordinator',
        name: 'test request 3',
        status: 'open'
      })
    ]).then(results => t.end());
  });
});

test.cb.after.always(t => {
  mongoose.connection.db.dropDatabase(t.end);
});

//
// GET all requests
//

test('GET /requests - list all requests (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: '/requests'
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.meta !== undefined);
    t.true(results.results.length >= 3);
    t.is(results.results[0].name, 'test request 1');
  });
});

//
// GET a specific request
//

test('GET /requests/{ruuid} - specific request (not found)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/requests/${rid(99999)}`
  }).then(res => {
    t.is(res.statusCode, 404, 'Status code is 404');
  });
});

test('GET /requests/{ruuid} - specific request (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/requests/${rid(1)}`
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    t.is(res.result.name, 'test request 1');
  });
});

//
// POST create request
//

test('POST /requests/ - create request (invalid role)', t => {
  return instance.injectThen({
    method: 'POST',
    url: '/requests',
    credentials: {
      user_id: 'invalid',
      roles: ['invalid']
    },
    payload: {
      name: 'test'
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('POST /requests/ - create request (surveyor role)', t => {
  return instance.injectThen({
    method: 'POST',
    url: '/requests',
    credentials: {
      user_id: 'surveyor',
      roles: ['surveyor']
    },
    payload: {
      name: 'test'
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('POST /requests/ - create request (coordinator role)', t => {
  return instance.injectThen({
    method: 'POST',
    url: '/requests',
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    },
    payload: {
      name: 'adding new request'
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var request = res.result.results;
    t.is(request.name, 'adding new request');
    t.is(request.status, 'open');
  });
});

//
// DELETE request
//

test('DELETE /requests/{ruuid} - delete request (no token)', t => {
  return instance.injectThen({
    method: 'DELETE',
    url: `/requests/${rid(1)}`
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Missing authentication', 'Missing authentication');
  });
});

test('DELETE /requests/{ruuid} - delete request (invalid role)', t => {
  return instance.injectThen({
    method: 'DELETE',
    url: `/requests/${rid(1)}`,
    credentials: {
      user_id: 'invalid',
      roles: ['invalid']
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('DELETE /requests/{ruuid} - delete request (surveyor role)', t => {
  return instance.injectThen({
    method: 'DELETE',
    url: `/requests/${rid(1)}`,
    credentials: {
      user_id: 'surveyor',
      roles: ['surveyor']
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('DELETE /requests/{ruuid} - delete request (coordinator role)', t => {
  // Create a request to be deleted.
  return createRequest({_id: rid(88), authorId: 'coordinator', name: 'test request delete', status: 'open'})
    .then((request) => instance.injectThen({
      method: 'DELETE',
      url: `/requests/${rid(88)}`,
      credentials: {
        user_id: 'coordinator',
        roles: ['coordinator']
      }
    }))
    .then(res => {
      t.is(res.statusCode, 200, 'Status code is 200');
      t.is(res.result.message, 'Request deleted');
    });
});

test('DELETE /requests/{ruuid} - delete request and associated tasks (coordinator role)', t => {
  // Ensure that request tasks are deleted when the request is.
  // Create a request and tasks to be deleted.
  var reqId = rid(882);
  return Promise.all([
    createRequest({_id: reqId, authorId: 'coordinator', name: 'test request delete 2', status: 'open'}),
    createTask({_id: tid(88201), requestId: reqId, name: 'task 1', authorId: 'coordinator'}),
    createTask({_id: tid(88202), requestId: reqId, name: 'task 2', authorId: 'coordinator'}),
    createTask({_id: tid(88203), requestId: reqId, name: 'task 3', authorId: 'coordinator'})
  ])
    .then((data) => instance.injectThen({
      method: 'DELETE',
      url: `/requests/${reqId}`,
      credentials: {
        user_id: 'coordinator',
        roles: ['coordinator']
      }
    }))
    .then(res => {
      t.is(res.statusCode, 200, 'Status code is 200');
      t.is(res.result.message, 'Request deleted');
      t.is(res.result.tasksDeleted, 3);
    });
});
