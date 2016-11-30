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
          status: 'open',
          requestingOrg: 'the org',
          gsd: 0.30,
          productType: 'uav',
          purpose: 'the purpose',
          use: 'the imagery use',
          notes: 'no notes',
          timePeriodRequested: {
            from: '2016-11-01T00:00:00.000Z',
            to: '2016-11-21T00:00:00.000Z'
          }
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
          created: '2016-08-01T00:00:00.000Z',
          authorId: 'coordinator2',
          name: 'test request 3',
          status: 'closed'
        }),
        createRequest({
          _id: rid(4),
          created: '2016-09-01T00:00:00.000Z',
          authorId: 'coordinator',
          name: 'test request 4',
          status: 'open'
        }),
        createTask({_id: tid(401), requestId: rid(4), name: 'task 1', authorId: 'coordinator', status: 'open'}),
        createTask({_id: tid(402), requestId: rid(4), name: 'task 2', authorId: 'coordinator', status: 'completed'})
      ]);
    });
});

test.after.always(t => {
  return dropDb();
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
    t.true(results.results.length >= 4);
    t.is(results.results[0].name, 'test request 1');
  });
});

test('GET /requests - list requests with task info (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: '/requests'
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var id = rid(4);
    var theRequest = res.result.results.find(r => r._id.toString() === id);
    t.is(theRequest.name, 'test request 4');
    t.is(theRequest.tasksInfo.total, 2);
    t.is(theRequest.tasksInfo.status.open, 1);
    t.is(theRequest.tasksInfo.status.completed, 1);
  });
});

//
// GET all requests with filters
//
test('GET /requests - list all requests filter status (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: '/requests?status=open'
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.results.length === 3);
  });
});

test('GET /requests - list all requests filter status multiple (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: '/requests?status=open&status=closed'
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.results.length === 4);
  });
});

test('GET /requests - list all requests filter author (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: '/requests?author=coordinator2'
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.results.length === 1);
    t.is(results.results[0].name, 'test request 3');
  });
});

test('GET /requests - list all requests filter dateFrom (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: '/requests?dateFrom=2016-08-01'
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.results.length === 2);
  });
});

test('GET /requests - list all requests filter dateFrom (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: '/requests?dateFrom=2016-06-01&dateTo=2016-07-01'
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.results.length === 2);
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

test('GET /requests/{ruuid} - specific request with task info (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/requests/${rid(4)}`
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var theRequest = res.result;
    t.is(theRequest.name, 'test request 4');
    t.is(theRequest.tasksInfo.total, 2);
    t.is(theRequest.tasksInfo.status.open, 1);
    t.is(theRequest.tasksInfo.status.completed, 1);
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

//
// PATCH requests
//

test('PATCH /requests/{requuid} - update request (invalid role)', t => {
  return instance.injectThen({
    method: 'PATCH',
    url: `/requests/${rid(1)}`,
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

test('PATCH /requests/{requuid} - update request (surveyor role)', t => {
  return instance.injectThen({
    method: 'PATCH',
    url: `/requests/${rid(1)}`,
    credentials: {
      user_id: 'surveyor',
      roles: ['surveyor']
    },
    payload: {
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('PATCH /requests/{requuid} - update non existen request (coordinator role)', t => {
  return instance.injectThen({
    method: 'PATCH',
    url: `/requests/${rid(999)}`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    },
    payload: {
    }
  }).then(res => {
    t.is(res.statusCode, 404, 'Status code is 404');
    t.is(res.result.message, 'Request does not exist');
  });
});

test('PATCH /requests/{requuid} - not set name as null (coordinator role)', t => {
  // Name as status cannot be set to null.
  return instance.injectThen({
    method: 'PATCH',
    url: `/requests/${rid(1)}`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    },
    payload: {
      name: null
    }
  }).then(res => {
    t.is(res.statusCode, 400, 'Status code is 400');
    var results = res.result;
    t.regex(results.message, /child "name" fails/);
  });
});

test('PATCH /requests/{requuid} - not set status as null (coordinator role)', t => {
  // Name as status cannot be set to null.
  return instance.injectThen({
    method: 'PATCH',
    url: `/requests/${rid(1)}`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    },
    payload: {
      status: null
    }
  }).then(res => {
    t.is(res.statusCode, 400, 'Status code is 400');
    var results = res.result;
    t.regex(results.message, /child "status" fails/);
  });
});

test('PATCH /requests/{requuid} - change name (coordinator role)', t => {
  return instance.injectThen({
    method: 'PATCH',
    url: `/requests/${rid(1)}`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    },
    payload: {
      name: 'new request name'
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.is(results.name, 'new request name');
  });
});

test('PATCH /requests/{requuid} - set allowed values to null (coordinator role)', t => {
  return instance.injectThen({
    method: 'PATCH',
    url: `/requests/${rid(1)}`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    },
    payload: {
      requestingOrg: null,
      gsd: null,
      productType: null,
      purpose: null,
      use: null,
      notes: null,
      timePeriodRequestedFrom: null
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.is(results.requestingOrg, null);
    t.is(results.gsd, null);
    t.is(results.productType, null);
    t.is(results.purpose, null);
    t.is(results.use, null);
    t.is(results.notes, null);
    // When changing `from` to null, `to` also changes.
    t.is(results.timePeriodRequested.from, null);
    t.is(results.timePeriodRequested.to, null);
  });
});
