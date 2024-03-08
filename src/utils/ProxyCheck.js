/*
 * check if an ip is a proxy via proxycheck.io
 */

/* eslint-disable max-classes-per-file */

import https from 'https';

import { HourlyCron } from './cron';

const HYSTERESIS = 60;

/*
 * class to serve proxycheck.io key
 * One paid account is allowed to have one additional free account,
 * which is good for fallback, if something goes wrong
 */
class PcKeyProvider {
  /*
   * @param pcKeys comma separated list of keys
   */
  constructor(pcKeys, logger) {
    const keys = (pcKeys)
      ? pcKeys.split(',')
      : [];
    if (!keys.length) {
      logger.info('You have to define PROXYCHECK_KEY to use proxycheck.io');
    }
    this.updateKeys = this.updateKeys.bind(this);
    /*
     * [
     *   [
     *     key,
     *     availableQueries: how many queries still available today,
     *     dailyLimit: how many queries available for today,
     *     burstAvailable: how many burst tokens available,
     *     denied: if key got denied
     *   ],..
     * ]
     */
    this.availableKeys = [];
    this.disabledKeys = [];
    this.logger = logger;
    this.getKeysUsage(keys);
    HourlyCron.hook(this.updateKeys);
  }

  /*
   * @return random available pcKey
   * disable key if close to daily limit
   */
  getKey() {
    const { availableKeys: keys } = this;
    while (keys.length) {
      const pos = Math.floor(Math.random() * keys.length);
      const keyData = keys[pos];
      const availableQueries = keyData[1] - 1;
      if (availableQueries >= HYSTERESIS) {
        keyData[1] = availableQueries;
        return keyData[0];
      }
      // eslint-disable-next-line max-len
      this.logger.warn(`PCKey: ${keyData[0]} close to daily limit, disabling it`);
      keys.splice(pos, 1);
      this.disabledKeys.push(keyData);
    }
    return this.enableBurst();
  }

  /*
   * select one available disabled key that is at daily limit and re-enabled it
   * to overuse it times 5
   */
  enableBurst() {
    const keyData = this.disabledKeys.find((k) => !k[4] && k[3] > 0);
    if (!keyData) {
      return null;
    }
    this.logger.info(`PCKey: ${keyData[0]}, using burst`);
    const pos = this.disabledKeys.indexOf(keyData);
    this.disabledKeys.splice(pos, 1);
    keyData[1] += keyData[2] * 4;
    keyData[2] *= 5;
    this.availableKeys.push(keyData);
    return keyData[0];
  }

  /*
   * get usage data of array of keys and put them into available / disabledKeys
   * @param keys Array of key strings
   */
  async getKeysUsage(keys) {
    const tmpKeys = [...keys];
    for (let i = 0; i < tmpKeys.length; i += 1) {
      let key = tmpKeys[i];
      if (typeof key !== 'string') {
        [key] = key;
      }
      // eslint-disable-next-line no-await-in-loop
      await this.getKeyUsage(key);
    }
  }

  /*
   * get usage data of key and put him into availableKeys or disabledKeys
   * @param key string
   */
  async getKeyUsage(key) {
    let usage;
    try {
      try {
        usage = await PcKeyProvider.requestKeyUsage(key);
      } finally {
        let pos = this.availableKeys.findIndex((k) => k[0] === key);
        if (~pos) this.availableKeys.splice(pos, 1);
        pos = this.disabledKeys.findIndex((k) => k[0] === key);
        if (~pos) this.disabledKeys.splice(pos, 1);
      }
    } catch (err) {
      this.logger.info(`PCKey: ${key}, Error ${err.message}`);
      this.disabledKeys.push([
        key,
        0,
        0,
        0,
        true,
      ]);
      return;
    }
    const queriesToday = Number(usage['Queries Today']) || 0;
    const availableBurst = Number(usage['Burst Tokens Available']) || 0;
    let dailyLimit = Number(usage['Daily Limit']) || 0;
    let burstActive = false;
    let availableQueries = dailyLimit - queriesToday;
    if (availableQueries < 0) {
      burstActive = true;
      dailyLimit *= 5;
      availableQueries = dailyLimit - queriesToday;
    }
    // eslint-disable-next-line max-len
    this.logger.info(`PCKey: ${key}, Queries Today: ${availableQueries} / ${dailyLimit} (Burst: ${availableBurst}, ${burstActive ? 'active' : 'inactive'})`);
    const keyData = [
      key,
      availableQueries,
      dailyLimit,
      availableBurst,
      false,
    ];
    if (burstActive || availableQueries > HYSTERESIS) {
      /*
       * data is a few minutes old, stop at HYSTERESIS
       */
      this.availableKeys.push(keyData);
    } else {
      this.disabledKeys.push(keyData);
    }
  }

  /*
   * TODO: proxycheck added the used burst token to API
   * query the API for limits
   * @param key
   */
  static requestKeyUsage(key) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'proxycheck.io',
        path: `/dashboard/export/usage/?key=${key}`,
        method: 'GET',
      };

      const req = https.request(options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Status not 200: ${res.statusCode}`));
          return;
        }

        res.setEncoding('utf8');
        const data = [];
        res.on('data', (chunk) => {
          data.push(chunk);
        });

        res.on('end', () => {
          try {
            const jsonString = data.join('');
            const result = JSON.parse(jsonString);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });
      req.end();
    });
  }

  /*
   * report denied key (over daily quota, rate limited, blocked,...)
   * @param key
   */
  denyKey(key) {
    const { availableKeys: keys } = this;
    const pos = keys.findIndex((k) => k[0] === key);
    if (~pos) {
      const keyData = keys[pos];
      keyData[4] = true;
      keys.splice(pos, 1);
      this.disabledKeys.push(keyData);
    }
  }

  /*
   * allow all denied keys again
   */
  async updateKeys() {
    await this.getKeysUsage(this.availableKeys);
    await this.getKeysUsage(this.disabledKeys);
  }
}


class ProxyCheck {
  constructor(pcKeys, logger) {
    /*
     * queue of ip-checking tasks
     * [[ip, callbackFunction],...]
     */
    this.queue = [];
    this.fetching = false;
    this.checkFromQueue = this.checkFromQueue.bind(this);
    this.checkIp = this.checkIp.bind(this);
    this.checkEmail = this.checkEmail.bind(this);
    this.pcKeyProvider = new PcKeyProvider(pcKeys, logger);
    this.logger = logger;
  }

  reqProxyCheck(values) {
    return new Promise((resolve, reject) => {
      const key = this.pcKeyProvider.getKey();
      if (!key) {
        setTimeout(
          () => reject(new Error('No pc key available')),
          2000,
        );
        return;
      }
      const postData = `ips=${values.join(',')}`;

      const options = {
        hostname: 'proxycheck.io',
        path: `/v2/?vpn=1&asn=1&key=${key}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Status not 200: ${res.statusCode}`));
          return;
        }
        res.setEncoding('utf8');
        const data = [];

        res.on('data', (chunk) => {
          data.push(chunk);
        });

        res.on('end', () => {
          try {
            const jsonString = data.join('');
            const result = JSON.parse(jsonString);
            if (result.status !== 'ok') {
              if (result.status === 'error' && values.length === 1) {
                /*
                 * invalid ip, like a link local address
                 * Error is either thrown in the top, when requesting only one ip
                 * or in the ip-part as "error": "No valid.." when multiple
                 * */
                resolve({
                  [values[0]]: {
                    proxy: 'yes',
                    type: 'Invalid IP',
                    disposable: 'yes',
                  },
                });
                return;
              }
              if (result.status === 'denied') {
                this.pcKeyProvider.denyKey(key);
              }
              if (result.status !== 'warning') {
                throw new Error(`${key}: ${result.message}`);
              } else {
                this.logger.warn(`Warning: ${key}: ${result.message}`);
              }
            }
            values.forEach((value) => {
              if (result[value] && result[value].error) {
                result[value] = {
                  proxy: 'yes',
                  type: 'Invalid IP',
                  disposable: 'yes',
                };
              }
            });
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
      });

      req.setTimeout(30000, () => {
        req.destroy(new Error('Connection TIMEOUT'));
      });
      req.on('error', (err) => {
        reject(err);
      });
      req.write(postData);
      req.end();
    });
  }

  updateKeys() {
    return this.pcKeyProvider.updateKeys();
  }

  async checkFromQueue() {
    const { queue } = this;
    if (!queue.length) {
      this.fetching = false;
      return;
    }
    this.fetching = true;
    const tasks = queue.slice(0, 50);
    const values = tasks.map((i) => i[0]);
    let res = {};
    try {
      res = await this.reqProxyCheck(values);
    } catch (err) {
      this.logger.error(`Error: ${err.message}`);
    }
    for (let i = 0; i < tasks.length; i += 1) {
      const task = tasks[i];

      const pos = queue.indexOf(task);
      if (~pos) queue.splice(pos, 1);

      const [value, cb] = task;

      if (~value.indexOf('@')) {
        // email check
        let disposable = null;

        if (res[value]) {
          this.logger.info(`Email ${value}: ${JSON.stringify(res[value])}`);
          disposable = res[value].disposable === 'yes';
        }

        cb(disposable);
      } else {
        // ip check
        let allowed = true;
        let status = -2;
        let pcheck = 'N/A';

        if (res[value]) {
          this.logger.info(`IP ${value}: ${JSON.stringify(res[value])}`);
          const { proxy, type, city } = res[value];
          allowed = proxy === 'no';
          status = (allowed) ? 0 : 1;
          pcheck = `${type},${city}`;
        }

        cb({
          allowed,
          status,
          pcheck,
        });
      }
    }
    setTimeout(this.checkFromQueue, 10);
  }

  /*
   * check if ip is proxy in queue
   * @param ip
   * @return Promise that resolves to
   * {
   *   status, 0: no proxy 1: proxy -2: any failure
   *   allowed, boolean if ip should be allowed to place
   *   pcheck, string info of proxycheck return (like type and city)
   * }
   */
  checkIp(ip) {
    return new Promise((resolve) => {
      this.queue.push([ip, resolve]);
      if (!this.fetching) {
        this.checkFromQueue();
      }
    });
  }

  /*
   * same as for ip
   * TODO: cache for mail providers, remember
   * a disposable provider for an hour or so
   * @param email
   * @return Promise that resolves to
   *  null: failure
   *  false: is legit provider
   *  true: is disposable provider
   */
  checkEmail(email) {
    return new Promise((resolve) => {
      this.queue.push([email, resolve]);
      if (!this.fetching) {
        this.checkFromQueue();
      }
    });
  }
}

export default ProxyCheck;
