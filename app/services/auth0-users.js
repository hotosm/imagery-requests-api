import request from 'request';

import config from '../config';

// Cache token. Since it's a management token for the whole app, we only
// need one and it can be cached.
var managementToken = {};

function getManagementToken () {
  return new Promise((resolve, reject) => {
    let ttl = (managementToken.expire || 0) - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      console.log('Cached token. Time to live:', ttl);
      return resolve(managementToken.access_token);
    }

    var options = {
      method: 'POST',
      url: `${config.auth0.api}/oauth/token`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: config.auth0.clientId,
        client_secret: config.auth0.secret,
        audience: `${config.auth0.api}/api/v2/`,
        grant_type: 'client_credentials'
      })
    };

    request(options, function (error, response, body) {
      console.log('new token requested');
      if (error) {
        console.log('error body', body);
        return reject(error);
      }

      let res = JSON.parse(body);
      res.expire = Math.floor(Date.now() / 1000) + res.expires_in;
      managementToken = res;
      return resolve(managementToken.access_token);
    });
  });
}

export function getAllUsers () {
  const perPage = 100;
  var data = null;
  return getManagementToken()
    .then(token => {
      return new Promise((resolve, reject) => {
        function fetcher (page) {
          request.get(`${config.auth0.api}/api/v2/users?per_page=${perPage}&page=${page}&include_totals=true&fields=user_metadata%2Cuser_id%2Capp_metadata`, {
            'auth': { 'bearer': token }
          }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
              var res = JSON.parse(body);
              if (data === null) {
                data = res.users;
              } else {
                data = data.concat(res.users);
              }

              if ((page + 1) * res.limit < res.total) {
                return fetcher(++page);
              } else {
                return resolve(data);
              }
            } else {
              console.log('error body', body);
              return reject(error);
            }
          });
        }
        fetcher(0);
      });
    });
}

export function getUser (uid) {
  return getManagementToken()
    .then(token => {
      return new Promise((resolve, reject) => {
        request.get(`${config.auth0.api}/api/v2/users/${uid}?fields=user_metadata%2Cuser_id%2Cemail%2Capp_metadata`, {
          'auth': { 'bearer': token }
        }, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            return resolve(JSON.parse(body));
          } else {
            console.log('error body', body);
            return reject(error);
          }
        });
      });
    });
}
