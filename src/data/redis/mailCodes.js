/*
 *
 * data saving for hourly events
 *
 */
import { randomUUID } from 'crypto';

import client from './client';

export const PREFIX = 'mail';
const EXPIRE_TIME = 3600;

/*
 * generate and set mail code
 * @param email
 * @return code
 */
export function setCode(email) {
  const code = randomUUID();
  const key = `${PREFIX}:${email}`;
  client.set(key, code, {
    EX: EXPIRE_TIME,
  });
  return code;
}

/*
 * check if email code is correct
 * @param email
 * @param code
 */
export async function checkCode(email, code) {
  const key = `${PREFIX}:${email}`;
  const storedCode = await client.get(key);
  if (!storedCode || code !== storedCode) {
    return false;
  }
  client.del(key);
  return true;
}

/*
 * check if code exists
 * @param email
 * @return null if doesn't, age in seconds if exists
 */
export async function codeExists(email) {
  const key = `${PREFIX}:${email}`;
  const ttl = await client.ttl(key);
  if (!ttl) {
    return null;
  }
  return EXPIRE_TIME - ttl;
}
