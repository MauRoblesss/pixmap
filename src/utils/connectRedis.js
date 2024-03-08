/*
 * forked from
 * https://github.com/tj/connect-redis
 *
 * Copyright(c) 2010-2020 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 *
 * and adjusted to work with node-redis v4 without legacyMode: true.
 *
 * Since connect-redis needs to support other redis clients (i.e.: ioredis)
 * as well, there is no chance for this to be merged upstream
 *
 * Links:
 *   express-session readme with Session Store Implementation section:
 *     https://github.com/expressjs/session#readme
 *
 */
import { Store } from 'express-session';

// All callbacks should have a noop if none provided for compatibility
// with the most Redis clients.
const noop = () => {};

class RedisStore extends Store {
  constructor(options = {}) {
    super(options);
    if (!options.client) {
      throw new Error('A client must be directly provided to the RedisStore');
    }

    this.prefix = options.prefix == null ? 'sess:' : options.prefix;
    this.scanCount = Number(options.scanCount) || 100;
    this.serializer = options.serializer || JSON;
    this.client = options.client;
    this.ttl = options.ttl || 86400; // One day in seconds.
    this.disableTTL = options.disableTTL || false;
    this.disableTouch = options.disableTouch || false;
  }

  get(sid, cb = noop) {
    const key = this.prefix + sid;
    this.client
      .get(key)
      .then((data) => {
        if (!data) {
          cb(null, null);
          return;
        }
        const result = this.serializer.parse(data);
        cb(null, result);
      })
      .catch((err) => {
        cb(err);
      });
  }

  set(sid, sess, cb = noop) {
    const key = this.prefix + sid;
    let value;
    try {
      value = this.serializer.stringify(sess);
    } catch (er) {
      cb(er);
      return;
    }

    let options;
    if (!this.disableTTL) {
      const ttl = this.getTTL(sess);
      if (ttl <= 0) {
        this.desroy(sid, cb);
        return;
      }
      options = {
        EX: ttl,
      };
    }

    this.client
      .set(key, value, options)
      .then(() => cb(null))
      .catch((err) => {
        cb(err);
      });
  }

  touch(sid, sess, cb = noop) {
    if (this.disableTouch || this.disableTTL) {
      cb(null, 'OK');
      return;
    }
    const key = this.prefix + sid;
    this.client
      .expire(key, this.getTTL(sess))
      .then((ret) => {
        if (!ret) {
          cb(null, 'EXPIRED');
          return;
        }
        cb(null, 'OK');
      })
      .catch((err) => {
        cb(err);
      });
  }

  destroy(sid, cb = noop) {
    const key = this.prefix + sid;
    this.client
      .del(key)
      .then(() => {
        cb(null);
      })
      .catch((err) => {
        cb(err);
      });
  }

  clear(cb = noop) {
    this.getAllKeys((er, keys) => {
      if (er) {
        cb(er);
        return;
      }
      this.client
        .del(keys)
        .then(() => cb(null))
        .catch((err) => {
          cb(err);
        });
    });
  }

  length(cb = noop) {
    this.getAllKeys((err, keys) => {
      if (err) {
        cb(err);
        return;
      }
      cb(null, keys.length);
    });
  }

  ids(cb = noop) {
    const prefixLen = this.prefix.length;

    this.getAllKeys((err, keys) => {
      if (err) {
        cb(err);
        return;
      }
      keys = keys.map((key) => key.substr(prefixLen));
      cb(null, keys);
    });
  }

  all(cb = noop) {
    const prefixLen = this.prefix.length;

    this.getAllKeys((er, keys) => {
      if (er) {
        cb(er);
        return;
      }
      if (keys.length === 0) {
        cb(null, []);
        return;
      }

      this.client
        .MGET(keys)
        .then((sessions) => {
          let errReduce = null;
          let result;
          try {
            result = sessions.reduce((accum, data, index) => {
              if (!data) return accum;
              data = this.serializer.parse(data);
              data.id = keys[index].substr(prefixLen);
              accum.push(data);
              return accum;
            }, []);
          } catch (e) {
            errReduce = e;
          }
          cb(errReduce, result);
        })
        .catch((err) => {
          cb(err);
        });
    });
  }

  getTTL(sess) {
    let ttl;
    if (sess && sess.cookie && sess.cookie.expires) {
      const ms = Number(new Date(sess.cookie.expires)) - Date.now();
      ttl = Math.ceil(ms / 1000);
    } else {
      ttl = this.ttl;
    }
    return ttl;
  }

  getAllKeys(cb = noop) {
    const pattern = `${this.prefix}*`;
    this.scanKeys({}, 0, pattern, this.scanCount, cb);
  }

  scanKeys(keys, cursor, pattern, count, cb = noop) {
    this.client
      .scan(cursor, {
        MATCH: pattern,
        COUNT: count,
      })
      .then((data) => {
        const { cursor: nextCursorId, keys: scanKeys } = data;
        for (let i = 0; i < scanKeys.length; i += 1) {
          keys[scanKeys[i]] = true;
        }

        // This can be a string or a number. We check both.
        if (Number(nextCursorId) !== 0) {
          this.scanKeys(keys, nextCursorId, pattern, count, cb);
          return;
        }

        cb(null, Object.keys(keys));
      })
      .catch((err) => {
        cb(err);
      });
  }
}

export default RedisStore;
