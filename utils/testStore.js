/*
 * This script is to test our fork of connect-redis
 * It gets all sessions, prints how many there are and the sets,
 * gets and destroys a testsession.
 * run with:
 * npm run babel-node utils/testStore.js
 */
import { createClient } from 'redis';

import RedisStore from '../src/utils/connectRedis';

const redis = createClient({
  url: 'redis://localhost:6379',
});

redis.connect()
  .then(() => {
    const store = new RedisStore({ client: redis });
    console.log('Test getting all sessions');
    store.all((err, sessions) => {
      console.log('Error', err);
      console.log('Amount of sessions', Object.keys(sessions).length);
      const firstkey = 'test';
      console.log('Trying to create session', firstkey);
      store.set(firstkey, {LOL: 'haha'}, (err) => {
        console.log('Error', err);
        console.log('Trying to get session', firstkey);
        store.get(firstkey, (err, session) => {
          console.log('Error', err);
          console.log('session', session);
          store.touch(firstkey, {}, (err, result) => {
            console.log('Error', err);
            console.log('touch result', result);
            console.log('Trying to destroy session', firstkey);
            store.destroy(firstkey, (err) => {
              console.log('Error', err);
            });
          })
        });
      })
    });
  });
