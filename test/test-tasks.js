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
      createTask({_id: tid(0), requestId: reqId, name: 'task 1', authorId: 'coordinator-userid', deliveryTime: '2016-11-30T00:00:00.000Z'}),
      createTask({
        _id: tid(1),
        requestId: reqId,
        name: 'task 2',
        authorId: 'coordinator-userid',
        assigneeId: 'assigned-surveyor',

        geometry: [[10, 20], [20, 10]],
        deliveryTime: '2016-11-30T00:00:00.000Z',
        timePeriodProvided: {
          from: '2016-11-01T00:00:00.000Z',
          to: '2016-11-21T00:00:00.000Z'
        }
      }),
      createTask({_id: tid(2), requestId: reqId, name: 'task 3', authorId: 'coordinator-userid'}),
      createTask({_id: tid(3), requestId: reqId, name: 'task 4', authorId: 'coordinator-userid'})
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
// GET request tasks
//

test('GET /requests/{requuid}/tasks - list all request tasks (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/requests/${rid(1)}/tasks`
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.true(results.meta !== undefined);
    t.true(results.results.length >= 4);
    t.is(results.results[0].name, 'task 1');
  });
});

//
// GET specific task
//

test('GET /requests/{requuid}/tasks/{tuuid} - get specific task (public)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/requests/${rid(1)}/tasks/${tid(0)}`
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    t.is(res.result.name, 'task 1');
  });
});

test('GET /requests/{requuid}/tasks/{tuuid} - get specific task (not found)', t => {
  return instance.injectThen({
    method: 'GET',
    url: `/requests/${rid(1)}/tasks/${tid(99999)}`
  }).then(res => {
    t.is(res.statusCode, 404, 'Status code is 404');
  });
});

//
// PATCH
//

test('PATCH /requests/{requuid}/tasks/{tuuid} - update task (invalid role)', t => {
  return instance.injectThen({
    method: 'PATCH',
    url: `/requests/${rid(1)}/tasks/${tid(0)}`,
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
    url: `/requests/${rid(1)}/tasks/${tid(0)}`,
    credentials: {
      user_id: 'unassigned-surveyor',
      roles: ['surveyor']
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
    url: `/requests/${rid(1)}/tasks/${tid(1)}`,
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
    // When changing `from` to null, `to` also changes.
    t.is(results.timePeriodProvided.from, null);
    t.is(results.timePeriodProvided.to, null);
  });
});

test('PATCH /requests/{requuid}/tasks/{tuuid} - update task (coordinator role)', t => {
  return instance.injectThen({
    method: 'PATCH',
    url: `/requests/${rid(1)}/tasks/${tid(0)}`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    },
    payload: {
      name: 'new name',
      assigneeId: null
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var results = res.result;
    t.is(results.name, 'new name');
    t.is(results.deliveryTime.toISOString(), '2016-11-30T00:00:00.000Z');
  });
});

test('PATCH /requests/{requuid}/tasks/{tuuid} - not set geometry as null (coordinator role)', t => {
  // Should not be possible to set geometry as null.
  return instance.injectThen({
    method: 'PATCH',
    url: `/requests/${rid(1)}/tasks/${tid(0)}`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    },
    payload: {
      name: 'new name',
      geometry: null
    }
  }).then(res => {
    t.is(res.statusCode, 400, 'Status code is 400');
    var results = res.result;
    t.regex(results.message, /child "geometry" fails/);
  });
});

//
// POST updates
//

test('POST /requests/{requuid}/tasks/{tuuid}/updates - add task update (invalid role)', t => {
  return instance.injectThen({
    method: 'POST',
    url: `/requests/${rid(1)}/tasks/${tid(0)}/updates`,
    credentials: {
      user_id: 'invalid',
      roles: ['invalid']
    },
    payload: {
      status: 'unchanged',
      comment: 'Flight not possible, bad weather conditions'
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('POST /requests/{requuid}/tasks/{tuuid}/updates - add task update (surveyor role unassigned)', t => {
  return instance.injectThen({
    method: 'POST',
    url: `/requests/${rid(1)}/tasks/${tid(0)}/updates`,
    credentials: {
      user_id: 'unassigned-surveyor',
      roles: ['surveyor']
    },
    payload: {
      status: 'unchanged',
      comment: 'Flight not possible, bad weather conditions'
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('POST /requests/{requuid}/tasks/{tuuid}/updates - add task update (non existent task)', t => {
  return instance.injectThen({
    method: 'POST',
    url: `/requests/${rid(1)}/tasks/${tid(9999999)}/updates`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    },
    payload: {
      status: 'unchanged',
      comment: 'Flight not possible, bad weather conditions'
    }
  }).then(res => {
    t.is(res.statusCode, 404, 'Status code is 404');
    t.is(res.result.message, 'Task does not exist');
  });
});

test('POST /requests/{requuid}/tasks/{tuuid}/updates - add task update (surveyor role assigned)', t => {
  return instance.injectThen({
    method: 'POST',
    url: `/requests/${rid(1)}/tasks/${tid(1)}/updates`,
    credentials: {
      user_id: 'assigned-surveyor',
      roles: ['surveyor']
    },
    payload: {
      status: 'unchanged',
      comment: 'Flight not possible, bad weather conditions'
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var update = res.result.updates[res.result.updates.length - 1];
    t.is(update.authorId, 'assigned-surveyor');
    t.is(update.status, 'unchanged');
    t.is(update.comment, 'Flight not possible, bad weather conditions');
  });
});

test('POST /requests/{requuid}/tasks/{tuuid}/updates - add task update (coordinator role)', t => {
  return instance.injectThen({
    method: 'POST',
    url: `/requests/${rid(1)}/tasks/${tid(0)}/updates`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    },
    payload: {
      status: 'unchanged',
      comment: 'Flight not possible, bad weather conditions'
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var update = res.result.updates[res.result.updates.length - 1];
    t.is(update.authorId, 'coordinator');
    t.is(update.status, 'unchanged');
    t.is(update.comment, 'Flight not possible, bad weather conditions');
  });
});

//
// POST create task
//

test('POST /requests/{requuid}/tasks - add task (invalid role)', t => {
  return instance.injectThen({
    method: 'POST',
    url: `/requests/${rid(1)}/tasks`,
    credentials: {
      user_id: 'invalid',
      roles: ['invalid']
    },
    payload: {
      name: 'adding new task',
      geometry: [[0, 0], [1, 1]]
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('POST /requests/{requuid}/tasks - add task (surveyor role)', t => {
  return instance.injectThen({
    method: 'POST',
    url: `/requests/${rid(1)}/tasks`,
    credentials: {
      user_id: 'surveyor',
      roles: ['surveyor']
    },
    payload: {
      name: 'adding new task',
      geometry: [[0, 0], [1, 1]]
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('POST /requests/{requuid}/tasks - add task (non existent request)', t => {
  return instance.injectThen({
    method: 'POST',
    url: `/requests/${tid(99999)}/tasks`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    },
    payload: {
      name: 'adding new task',
      geometry: [[0, 0], [1, 1]]
    }
  }).then(res => {
    t.is(res.statusCode, 404, 'Status code is 404');
    t.is(res.result.message, 'Request does not exist');
  });
});

test('POST /requests/{requuid}/tasks - add task (coordinator role)', t => {
  return instance.injectThen({
    method: 'POST',
    url: `/requests/${rid(1)}/tasks`,
    credentials: {
      user_id: 'coordinator',
      roles: ['coordinator']
    },
    payload: {
      name: 'adding new task',
      geometry: [[0, 0], [1, 1]]
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    var task = res.result.results;
    t.is(task.name, 'adding new task');
    t.deepEqual(task.geometry, [[0, 0], [1, 1]]);
    t.is(task.updates[0].status, 'open');
    t.is(task.updates[0].comment, 'Task was created');
  });
});

//
// DELETE task
//

test('DELETE /requests/{requuid}/tasks - add task (invalid role)', t => {
  return instance.injectThen({
    method: 'DELETE',
    url: `/requests/${rid(1)}/tasks/${tid(0)}`,
    credentials: {
      user_id: 'invalid',
      roles: ['invalid']
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('DELETE /requests/{requuid}/tasks - add task (surveyor role)', t => {
  return instance.injectThen({
    method: 'DELETE',
    url: `/requests/${rid(1)}/tasks/${tid(0)}`,
    credentials: {
      user_id: 'surveyor',
      roles: ['surveyor']
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Not authorized to perform this action', 'Not authorized to perform this action');
  });
});

test('DELETE /requests/{requuid}/tasks - add task (coordinator role)', t => {
  // Create a task to be deleted.
  return createTask({_id: tid(8), requestId: rid(1), name: 'to delete', authorId: 'coordinator-userid'})
    .then((task) => instance.injectThen({
      method: 'DELETE',
      url: `/requests/${rid(1)}/tasks/${tid(8)}`,
      credentials: {
        user_id: 'coordinator',
        roles: ['coordinator']
      }
    }))
    .then(res => {
      t.is(res.statusCode, 200, 'Status code is 200');
      t.is(res.result.message, 'Task deleted');
    });
});
