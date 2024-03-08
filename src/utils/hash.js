/*
 * password hashing
 */

import bcrypt from 'bcrypt';

export function generateHash(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
}

export function compareToHash(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compareSync(password, hash);
}
