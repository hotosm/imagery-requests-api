'use strict';
require('dotenv').config();

import config from './config';
import Server from './services/server';

// Start API server
var server = new Server(config.connection);
server.start(() => {
  // Started.
});
