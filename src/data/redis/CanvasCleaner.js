/*
 * storing Event data
 */

import client from './client';
import logger from '../../core/logger';

const DATA_KEY = 'clr:dat';
const STAT_KEY = 'clr:sta';

/*
 * Gets data of CanvasCleaner from redis
 * @return Array with [canvasId, x, y, u, v, methodName] (all int except Name)
 *   (check core/CanvasCleaner for the meaning)
*/
export async function getData() {
  const data = await client.get(DATA_KEY);
  if (data) {
    const parsedData = data.toString().split(':');
    for (let i = 0; i < parsedData.length - 1; i += 1) {
      const num = parseInt(parsedData[i], 10);
      if (Number.isNaN(num)) {
        logger.warn(
          // eslint-disable-next-line max-len
          `[CanvasCleaner] ${DATA_KEY} in redis does not seem legit (int conversion).`,
        );
        return [0, 0, 0, 0, 0, 0, ''];
      }
      parsedData[i] = num;
    }
    if (parsedData.length === 6) {
      return parsedData;
    }
    logger.warn(
      `[CanvasCleaner] ${DATA_KEY} in redis does not seem legit.`,
    );
  }
  return [0, 0, 0, 0, 0, 0, ''];
}

/*
 * Writes data of CanvasCleaner to redis
 * @param check out core/CanvasCleaner
 */
export async function setData(canvasId, x, y, u, v, methodName) {
  const dataStr = `${canvasId}:${x}:${y}:${u}:${v}:${methodName}`;
  if (
    Number.isNaN(parseInt(canvasId, 10))
    || Number.isNaN(parseInt(x, 10))
    || Number.isNaN(parseInt(y, 10))
    || Number.isNaN(parseInt(u, 10))
    || Number.isNaN(parseInt(v, 10))
  ) {
    logger.warn(
      `[CanvasCleaner] can not write ${dataStr} to redis, seems not legit.`,
    );
    return null;
  }
  return client.set(DATA_KEY, dataStr);
}

/*
 * Gets status of CanvasCleaner from redis
 * @return Array with [cIter, running]
 *   cIter: current chunk iterator integer
 *   running: boolean if filter is running
 */
export async function getStatus() {
  const stat = await client.get(STAT_KEY);
  if (stat) {
    const parsedStat = stat.toString().split(':');
    if (parsedStat.length !== 2) {
      logger.warn(
        `[CanvasCleaner] ${STAT_KEY} in redis is incomplete.`,
      );
    } else {
      const cIter = parseInt(parsedStat[0], 10);
      const running = !!parseInt(parsedStat[1], 10);
      if (!Number.isNaN(cIter)) {
        return [cIter, running];
      }
      logger.warn(
        `[CanvasCleaner] ${STAT_KEY} in redis does not seem legit.`,
      );
    }
  }
  return [0, false];
}

/*
 * Writes status of CanvasCleaner to redis
 * @param cIter current chunk iterator integer
 * @param running Boolean if running or not
 */
export async function setStatus(cIter, running) {
  const runningInt = (running) ? 1 : 0;
  const statString = `${cIter}:${runningInt}`;
  if (
    Number.isNaN(parseInt(cIter, 10))
  ) {
    logger.warn(
      `[CanvasCleaner] can not write ${statString} to redis, seems not legit.`,
    );
    return null;
  }
  return client.set(STAT_KEY, statString);
}
