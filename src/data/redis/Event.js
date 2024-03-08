/*
 *
 * data saving for hourly events
 *
 */
import { commandOptions } from 'redis';

// its ok if its slow
/* eslint-disable no-await-in-loop */

import client from './client';
import logger from '../../core/logger';
import RedisCanvas from './RedisCanvas';

const EVENT_SUCCESS_KEY = 'evt:succ';
const EVENT_TIMESTAMP_KEY = 'evt:time';
const EVENT_POSITION_KEY = 'evt:pos';
const EVENT_BACKUP_PREFIX = 'evt:bck';
// Note: Events always happen on canvas 0
export const CANVAS_ID = '0';


/*
 * set success status of event
 * 0 = waiting
 * 1 = won
 * 2 = lost
 */
export function setSuccess(success) {
  return client.set(EVENT_SUCCESS_KEY, success);
}
export async function getSuccess() {
  const success = await client.get(EVENT_SUCCESS_KEY);
  return (success) ? parseInt(success, 10) : 0;
}

/*
 * @return time till next event in seconds
 */
export async function nextEvent() {
  const timestamp = await client.get(EVENT_TIMESTAMP_KEY);
  if (timestamp) {
    return Number(timestamp.toString());
  }
  return null;
}

/*
 * @return cell of chunk coordinates of event
 */
export async function getEventArea() {
  const pos = await client.get(EVENT_POSITION_KEY);
  if (pos) {
    return pos.toString().split(':').map((z) => Number(z));
  }
  return null;
}

/*
 * restore area effected by last event
 */
export async function clearOldEvent() {
  const pos = await getEventArea();
  if (pos) {
    const [i, j] = pos;
    logger.info(`Restore last event area at ${i}/${j}`);
    // 3x3 chunk area centered at i,j
    for (let jc = j - 1; jc <= j + 1; jc += 1) {
      for (let ic = i - 1; ic <= i + 1; ic += 1) {
        try {
          const chunkKey = `${EVENT_BACKUP_PREFIX}:${ic}:${jc}`;
          const chunk = await client.get(
            commandOptions({ returnBuffers: true }),
            chunkKey,
          );
          if (!chunk) {
            logger.warn(
              // eslint-disable-next-line max-len
              `Couldn't get chunk event backup for ${ic}/${jc}, which is weird`,
            );
            continue;
          }
          if (chunk.length <= 1) {
            logger.info(
              // eslint-disable-next-line max-len
              `Tiny chunk in event backup, not-generated chunk at ${ic}/${jc}`,
            );
            await RedisCanvas.delChunk(ic, jc, CANVAS_ID);
          } else {
            logger.info(
              `Restoring chunk ${ic}/${jc} from event`,
            );
            await RedisCanvas.setChunk(ic, jc, chunk, CANVAS_ID);
          }
          await client.del(chunkKey);
        } catch (error) {
          logger.error(
            // eslint-disable-next-line max-len
            `Couldn't restore chunk from RpgEvent ${EVENT_BACKUP_PREFIX}:${ic}:${jc} : ${error.message}`,
          );
        }
      }
    }
    await client.del(EVENT_POSITION_KEY);
  }
}

/*
 * Set time of next event
 * @param minutes minutes till next event
 * @param i, j chunk coordinates of center of event
 */
export async function setNextEvent(minutes, i, j) {
  await clearOldEvent();
  for (let jc = j - 1; jc <= j + 1; jc += 1) {
    for (let ic = i - 1; ic <= i + 1; ic += 1) {
      let chunk = null;
      try {
        chunk = await RedisCanvas.getChunk(CANVAS_ID, ic, jc);
      } catch (error) {
        logger.error(
          // eslint-disable-next-line max-len
          `Could not load chunk ch:${CANVAS_ID}:${ic}:${jc} for RpgEvent backup: ${error.message}`,
        );
      }
      if (!chunk || !chunk.length) {
        // place a 1-length buffer inside to mark chunk as none-existent
        chunk = Buffer.allocUnsafe(1);
      }
      const chunkKey = `${EVENT_BACKUP_PREFIX}:${ic}:${jc}`;
      await client.set(chunkKey, chunk);
    }
  }
  await client.set(EVENT_POSITION_KEY, `${i}:${j}`);
  const timestamp = Date.now() + minutes * 60 * 1000;
  await client.set(EVENT_TIMESTAMP_KEY, timestamp);
}
