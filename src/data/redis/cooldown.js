/*
 * redis script for cooldown calculation
 * this does not set any pixels itself, see lua/placePixel.lua
 */
import client from './client';
import { PREFIX as CAPTCHA_PREFIX } from './captcha';
import { PREFIX as ALLOWED_PREFIX } from './isAllowedCache';
import {
  RANKED_KEY,
  DAILY_RANKED_KEY,
  DAILY_CRANKED_KEY,
  PREV_DAY_TOP_KEY,
  DAILY_CORANKED_KEY,
} from './ranks';
import { CAPTCHA_TIME } from '../../core/config';

const PREFIX = 'cd';

/*
 * checks how many of the given pixels can be set,
 * sets user cooldown, increments pixelcount
 * and returns the number of pixels to set
 * @param ip ip of request
 * @param id userId
 * @param ranked boolean if increasing rank
 * @param clrIgnore, bcd, pcd, cds information about canvas
 * @param i, j chunk coordinates
 * @param pxls Array with offsets of pixels
 * @return see lua/placePixel.lua
 */
export default function allowPlace(
  ip,
  id,
  country,
  cor,
  ranked,
  canvasId,
  i, j,
  clrIgnore,
  req,
  bcd,
  pcd,
  cds,
  cdIfNull,
  pxls,
) {
  const isalKey = `${ALLOWED_PREFIX}:${ip}`;
  const captKey = (CAPTCHA_TIME >= 0) ? `${CAPTCHA_PREFIX}:${ip}` : 'nope';
  const ipCdKey = `${PREFIX}:${canvasId}:ip:${ip}`;
  let idCdKey;
  if (id) {
    idCdKey = `${PREFIX}:${canvasId}:id:${id}`;
  /*
   * cooldown by subnet should be more restrictive
   *
  } else if (ip.includes('.')) {
    const ips = ip.slice(0, ip.lastIndexOf('.'));
    idCdKey = `${PREFIX}:${canvasId}:ips:${ips}`;
  */
  } else {
    idCdKey = 'nope';
  }
  if (!req && req !== 0) {
    req = 'nope';
  }
  const chunkKey = `ch:${canvasId}:${i}:${j}`;
  const cc = country || 'xx';
  const rankset = RANKED_KEY;
  const dailyset = (ranked) ? DAILY_RANKED_KEY : 'nope';
  return client.placePxl(
    // eslint-disable-next-line max-len
    isalKey, captKey, ipCdKey, idCdKey, chunkKey, rankset, dailyset, DAILY_CRANKED_KEY, PREV_DAY_TOP_KEY, DAILY_CORANKED_KEY,
    clrIgnore, bcd, pcd, cds, cdIfNull, id, cc, req, cor,
    ...pxls,
  );
}

/*
 * get cooldown of specific user
 * @param ip ip of request
 * @param id userId
 * @param canvasId
 * @return cooldown
 */
export async function getCoolDown(
  ip,
  id,
  canvasId,
) {
  let ttl = await client.pTTL(`${PREFIX}:${canvasId}:ip:${ip}`);
  if (id) {
    const ttlid = await client.pTTL(`${PREFIX}:${canvasId}:id:${id}`);
    ttl = Math.max(ttl, ttlid);
  /*
   * cooldown by subnet should be more restrictive
   *
  } else if (ip.includes('.')) {
    const ips = ip.slice(0, ip.lastIndexOf('.'));
    const ttlid = await client.pTTL(`${PREFIX}:${canvasId}:ips:${ips}`);
    ttl = Math.max(ttl, ttlid);
  */
  }
  const cooldown = ttl < 0 ? 0 : ttl;
  return cooldown;
}

/*
 * set cooldown of specific user
 * @param ip ip of request
 * @param id userId
 * @param canvasId
 * @param cooldown (in ms)
 * @return cooldown
 */
export async function setCoolDown(
  ip,
  id,
  canvasId,
  cooldown,
) {
  // PX is milliseconds expire
  await client.set(`${PREFIX}:${canvasId}:ip:${ip}`, '', {
    PX: cooldown,
  });
  if (id) {
    await client.set(`${PREFIX}:${canvasId}:id:${id}`, '', {
      PX: cooldown,
    });
  }
  return true;
}
