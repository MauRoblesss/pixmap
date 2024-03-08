/*
 * chat mutes
 */
import client from './client';
import { PREFIX as ALLOWED_PREFIX } from './isAllowedCache';

const MUTE_PREFIX = 'mute';
const MUTEC_PREFIX = 'mutec';

/*
 * check if user can send chat message in channel
 */
export async function allowedChat(
  channelId,
  userId,
  ip,
  cc,
) {
  const mutecKey = `${MUTEC_PREFIX}:${channelId}`;
  const muteKey = `${MUTE_PREFIX}:${userId}`;
  const isalKey = `${ALLOWED_PREFIX}:${ip}`;
  const country = (cc?.length !== 2 || userId < 5000) ? 'nope' : cc;
  return client.allowedChat(
    mutecKey,
    muteKey,
    isalKey,
    country,
  );
}

/*
 * check if user is muted
 */
export async function checkIfMuted(userId) {
  const key = `${MUTE_PREFIX}:${userId}`;
  const ttl = await client.ttl(key);
  return ttl;
}

/*
 * mute user
 * @param userId
 * @param ttl mute time in minutes
 */
export function mute(userId, ttl) {
  const key = `${MUTE_PREFIX}:${userId}`;
  if (ttl) {
    return client.set(key, '', {
      EX: ttl * 60,
    });
  }
  return client.set(key, '');
}

/*
 * unmute user
 * @param userId
 * @return boolean for success
 */
export async function unmute(userId) {
  const key = `${MUTE_PREFIX}:${userId}`;
  const ret = await client.del(key);
  return ret !== 0;
}

/*
 * mute country from channel
 * @param channelId
 * @param cc country code
 * @returns 1 if muted, 0 if already was muted, null if invalid
 */
export function mutec(channelId, cc) {
  if (!cc || cc.length !== 2) {
    return null;
  }
  const key = `${MUTEC_PREFIX}:${channelId}`;
  return client.hSetNX(key, cc, '');
}

/*
 * unmute country from channel
 * @param channelId
 * @param cc country code
 * @return boolean if unmute successful, null if invalid
 */
export async function unmutec(channelId, cc) {
  if (!cc || cc.length !== 2) {
    return null;
  }
  const key = `${MUTEC_PREFIX}:${channelId}`;
  const ret = await client.hDel(key, cc, '');
  return ret !== 0;
}

/*
 * unmute all countries from channel
 * @param channelId
 * @return boolean for success
 */
export async function unmutecAll(channelId) {
  const key = `${MUTEC_PREFIX}:${channelId}`;
  const ret = await client.del(key);
  return ret !== 0;
}

/*
 * get list of muted countries
 * @param channelId
 * @return array with country codes that are muted
 */
export async function listMutec(channelId) {
  const key = `${MUTEC_PREFIX}:${channelId}`;
  const ret = await client.hKeys(key);
  return ret;
}
