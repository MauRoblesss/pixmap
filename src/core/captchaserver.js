/*
 * creation of captchas
 */

import { Worker } from 'worker_threads';

import logger from './logger';

const MAX_WAIT = 30 * 1000;

/*
 * worker thread
 */
const worker = new Worker('./workers/captchaloader.js');

/*
 * queue of captcha-generation tasks
 * [[ timestamp, callbackFunction ],...]
 */
const captchaQueue = [];

/*
 * generate a captcha in the worker thread
 * calls callback with arguments:
 *  (error, captcha.text, captcha.svgdata, captcha.id)
 */
function requestCaptcha(cb) {
  worker.postMessage('createCaptcha');
  captchaQueue.push([
    Date.now(),
    cb,
  ]);
}

/*
 * answer of worker thread
 */
worker.on('message', (msg) => {
  while (captchaQueue.length) {
    const task = captchaQueue.shift();
    try {
      task[1](...msg);
      return;
    } catch {
      // continue
    }
  }
});

/*
 * clear requests if queue can't keep up
 */
function clearOldQueue() {
  const now = Date.now();
  if (captchaQueue.length
    && now - captchaQueue[0][0] > MAX_WAIT) {
    logger.warn('Captchas: Queue can not keep up!');
    captchaQueue.forEach((task) => {
      try {
        task[1]('TIMEOUT');
      } catch {
        // nothing
      }
    });
    captchaQueue.length = 0;
  }
}

setInterval(clearOldQueue, MAX_WAIT);

export default requestCaptcha;
