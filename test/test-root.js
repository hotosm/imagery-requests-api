'use strict';
import test from 'ava';

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
});

test('endpoint / should have statusCode 200', t => {
  return instance.injectThen({
    method: 'GET',
    url: '/'
  }).then(res => {
    t.is(res.statusCode, 200, 'Status code is 200');
  });
});
