/*
 * cache allowed ips
 * used for proxychecker and banlist
 */

import client from './client';

export const PREFIX = 'isal';
const CACHE_DURATION = 14 * 24 * 3600;

export function cacheAllowed(ip, status) {
  const key = `${PREFIX}:${ip}`;
  const expires = (status !== -2) ? CACHE_DURATION : 3600;
  return client.set(key, status, {
    EX: expires,
  });
}

export async function getCacheAllowed(ip) {
  const key = `${PREFIX}:${ip}`;
  let cache = await client.get(key);
  if (!cache) {
    return null;
  }
  cache = parseInt(cache, 10);
  return {
    allowed: (cache <= 0),
    status: cache,
  };
}

export function cleanCacheForIP(ip) {
  const key = `${PREFIX}:${ip}`;
  return client.del(key);
}
