'use strict';
require('dotenv').config();

import config from './config';
import Server from './services/server';

var options = {
  connection: config.connection,
  db: config.mongo.uri
};

// Start API server
var server = new Server(options);
server.start(() => {
  // Started.
});
