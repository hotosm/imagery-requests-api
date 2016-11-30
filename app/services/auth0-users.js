import request from 'request';

import config from '../config';

export function getAllUsers () {
  const perPage = 100;
  var data = null;
  return new Promise((resolve, reject) => {
    function fetcher (page) {
      request.get(`${config.auth0.api}/users?per_page=${perPage}&page=${page}&include_totals=true&fields=user_metadata%2Cuser_id%2Capp_metadata`, {
        'auth': { 'bearer': config.auth0.manageToken }
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
          return reject(error);
        }
      });
    }
    fetcher(0);
  });
}

export function getUser (uid) {
  return new Promise((resolve, reject) => {
    request.get(`${config.auth0.api}/users/${uid}?fields=user_metadata%2Cuser_id%2Cemail%2Capp_metadata`, {
      'auth': { 'bearer': config.auth0.manageToken }
    }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        return resolve(JSON.parse(body));
      } else {
        return reject(error);
      }
    });
  });
}
