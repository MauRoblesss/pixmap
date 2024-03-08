/*
 * Cron job of argumentless functions that will get run in a specific interval,
 * at full hours
 */
import { HOUR } from '../core/constants';

import logger from '../core/logger';

class Cron {
  // timestamp of last run
  lastRun;
  // interval in hours
  interval;
  // array with functions to run
  functions;
  // timeout return
  timeout;

  // interval = how many hours between runs
  // lastRun = when this cron job was last run
  constructor(interval, lastRun = 0) {
    this.checkForExecution = this.checkForExecution.bind(this);
    this.interval = interval;
    this.lastRun = lastRun;
    this.functions = [];

    const ct = new Date();
    const msToNextFullHour = HOUR
      - (ct.getUTCMinutes() * 60 + ct.getUTCSeconds()) * 1000;
    this.timeout = setTimeout(this.checkForExecution, msToNextFullHour);
  }

  checkForExecution() {
    this.timeout = setTimeout(this.checkForExecution, HOUR);
    const curDate = new Date();
    const curTime = curDate.getTime();
    if (curTime + 120000 > this.lastRun + this.interval * HOUR) {
      // eslint-disable-next-line max-len
      logger.info(`${curDate.toUTCString()}> Run cron events for interval: ${this.interval}h`);
      this.lastRun = curTime;
      this.functions.forEach(async (item) => {
        try {
          await item();
        } catch (err) {
          logger.error(`Error on cron job: ${err.message}`);
        }
      });
    }
  }

  hook(func) {
    this.functions.push(func);
  }
}


function initializeDailyCron() {
  const now = new Date();
  // make it first run at midnight
  const lastRun = now.getTime()
    - now.getUTCHours() * HOUR
    - (now.getUTCMinutes() * 60 + now.getUTCSeconds()) * 1000;
  return new Cron(24, lastRun);
}

function initializeHourlyCron() {
  return new Cron(1);
}

export const DailyCron = initializeDailyCron();

export const HourlyCron = initializeHourlyCron();
