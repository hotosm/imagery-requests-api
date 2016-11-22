'use strict';
import test from 'ava';
import mongoose from 'mongoose';

import config from '../app/config';
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

  mongoose.connect(config.mongo.testUri);
  mongoose.connection.on('error', function (err) {
    throw err;
  });
});

test.cb.after(t => {
  mongoose.connection.db.dropDatabase(t.end);
});

test('endpoint /requests no token', t => {
  return instance.injectThen({
    method: 'POST',
    url: '/requests',
    payload: {
      name: 'test'
    }
  }).then(res => {
    t.is(res.statusCode, 401, 'Status code is 401');
    t.is(res.result.message, 'Missing authentication', 'Missing authentication');
  });
});

test('endpoint /requests invalid role', t => {
  return instance.injectThen({
    method: 'POST',
    url: '/requests',
    credentials: {
      user_id: 'test',
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

test('endpoint /requests coordinator role', t => {
  return instance.injectThen({
    method: 'POST',
    url: '/requests',
    credentials: {
      user_id: 'test',
      roles: ['coordinator']
    },
    payload: {
      name: 'test'
    }
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
    t.is(res.result.name, 'test', 'test');
  });
});
