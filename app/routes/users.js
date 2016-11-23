import Boom from 'boom';
import _ from 'lodash';

import { getAllUsers } from '../services/auth0-users';

module.exports = [
  {
    /* Get list of users from auth0 */
    method: 'GET',
    path: '/users',
    config: {
      auth: false
    },
    handler: (req, reply) => {
      getAllUsers().then(data => {
        // Simplify user profiles.
        data = data.map(o => {
          return {
            userId: o.user_id,
            name: _.get(o, 'user_metadata.name', 'n/a')
          };
        });
        reply(data);
      }).catch(err => reply(Boom.badImplementation(err)));
    }
  }
];
