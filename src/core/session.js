/*
 *
 */
import session from 'express-session';
import RedisStore from '../utils/connectRedis';

import client from '../data/redis/client';
import { getHostFromRequest } from '../utils/ip';
import { HOUR, COOKIE_SESSION_NAME } from './constants';
import { SESSION_SECRET, SHARD_NAME } from './config';


const middlewareStore = {};

export default (req, res, next) => {
  const domain = (SHARD_NAME)
    ? getHostFromRequest(req, false, true)
    : null;
  let sess = middlewareStore[domain];
  if (!sess) {
    const store = new RedisStore({ client });
    sess = session({
      name: COOKIE_SESSION_NAME,
      store,
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        domain,
        httpOnly: true,
        secure: false,
        maxAge: 30 * 24 * HOUR,
      },
    });
    middlewareStore[domain] = sess;
  }
  return sess(req, res, next);
};
