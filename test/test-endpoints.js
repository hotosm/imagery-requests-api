/* global describe, it, before, after */
'use strict';

var assert = require('chai').assert;
import config from '../app/config';

import Server from '../app/services/server';

var options = {
  connection: {port: 2000, host: '0.0.0.0'},
  db: config.mongo.test_uri
};

describe('Testing endpoints', function () {
  var instance = Server(options).hapi;

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('/', function () {
    it('should have status 200', function (done) {
      var options = {
        method: 'GET',
        url: '/'
      };

      instance.inject(options, function (response) {
        assert.equal(response.statusCode, 200);
        done();
      });
    });
  });
});
