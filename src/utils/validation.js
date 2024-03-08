/*
 * Functions for validation of user input
 * This gets used on server and on the client.
 *
 * On the server the return values will be again translated with gettext
 * which could be a bit questionable, but it is preferable to write this file
 * two times imho.
 *
 */

import { t } from 'ttag';

// eslint-disable-next-line no-useless-escape, max-len
const mailTester = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

export function validateEMail(email) {
  if (!email) return t`Email can't be empty.`;
  if (email.length < 5) return t`Email should be at least 5 characters long.`;
  if (email.length > 40) return t`Email can't be longer than 40 characters.`;
  if (email.indexOf('.') === -1) return t`Email should at least contain a dot`;
  if (email.split('').filter((x) => x === '@').length !== 1) {
    return t`Email should contain a @`;
  }
  if (!mailTester.test(email)) return 'Your Email looks shady';
  return false;
}

export function validateName(name) {
  if (!name) return t`Name can't be empty.`;
  if (name.length < 2) return t`Name must be at least 2 characters long`;
  if (name.length > 26) return t`Name must be shorter than 26 characters`;
  if (name.indexOf('@') !== -1
      || name.indexOf('/') !== -1
      || name.indexOf('\\') !== -1
      || name.indexOf('>') !== -1
      || name.indexOf('<') !== -1
      || name.indexOf('#') !== -1) {
    return t`Name contains invalid character like @, /, \\ or #`;
  }
  return false;
}

export function sanitizeName(name) {
  name = name.substring(0, 25);
  // just sanitizes @ for now, other characters do not seem
  // problematic, even thought that we rule them out in validateName
  name = name.replace(/@/g, 'at');
  return name;
}

export function validatePassword(password) {
  if (!password) {
    return t`No password given.`;
  }
  if (password.length < 6) {
    return t`Password must be at least 6 characters long.`;
  }
  if (password.length > 60) {
    return t`Password must be shorter than 60 characters.`;
  }
  return false;
}

/*
 * validate an area given by top-left and bottom-right corner coords
 * @param ulcoor coords in x_y format, top-left corner
 * @param brcoor coords in x_y format, bottom-right corner
 * @param canvasSize dimension of canvas, integer
 * @return [x, y, u, v] Corner coords if success, error string is failure
 */
export function validateCoorRange(ulcoor, brcoor, canvasSize) {
  if (!ulcoor || !brcoor) {
    return 'Not all coordinates defined';
  }

  let splitCoords = ulcoor.trim().split('_');
  if (splitCoords.length !== 2) {
    return 'Invalid Coordinate Format for top-left corner';
  }
  const [x, y] = splitCoords.map((z) => Math.floor(Number(z)));
  splitCoords = brcoor.trim().split('_');
  if (splitCoords.length !== 2) {
    return 'Invalid Coordinate Format for bottom-right corner';
  }
  const [u, v] = splitCoords.map((z) => Math.floor(Number(z)));

  let error = null;
  if (Number.isNaN(x)) {
    error = 'x of top-left corner is not a valid number';
  } else if (Number.isNaN(y)) {
    error = 'y of top-left corner is not a valid number';
  } else if (Number.isNaN(u)) {
    error = 'x of bottom-right corner is not a valid number';
  } else if (Number.isNaN(v)) {
    error = 'y of bottom-right corner is not a valid number';
  } else if (u < x || v < y) {
    error = 'Corner coordinates are aligned wrong';
  }
  if (error !== null) {
    return error;
  }

  const canvasMaxXY = canvasSize / 2;
  const canvasMinXY = -canvasMaxXY;
  if (x < canvasMinXY || y < canvasMinXY
      || x >= canvasMaxXY || y >= canvasMaxXY) {
    return 'Coordinates of top-left corner are outside of canvas';
  }
  if (u < canvasMinXY || v < canvasMinXY
      || u >= canvasMaxXY || v >= canvasMaxXY) {
    return 'Coordinates of bottom-right corner are outside of canvas';
  }

  return [x, y, u, v];
}
