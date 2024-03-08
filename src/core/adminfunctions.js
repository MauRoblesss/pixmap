/*
 * functions for admintools
 *
 */

/* eslint-disable no-await-in-loop */

import sharp from 'sharp';
import Sequelize from 'sequelize';

import isIPAllowed from './isAllowed';
import { validateCoorRange } from '../utils/validation';
import CanvasCleaner from './CanvasCleaner';
import socketEvents from '../socket/socketEvents';
import { RegUser } from '../data/sql';
import {
  cleanCacheForIP,
} from '../data/redis/isAllowedCache';
import { forceCaptcha } from '../data/redis/captcha';
import {
  isWhitelisted,
  whitelistIP,
  unwhitelistIP,
} from '../data/sql/Whitelist';
import {
  getBanInfo,
  banIP,
  unbanIP,
} from '../data/sql/Ban';
import {
  getInfoToIp,
  getIPofIID,
  getIIDofIP,
} from '../data/sql/IPInfo';
import {
  getIIDSummary,
  getIIDPixels,
  getSummaryFromArea,
  getPixelsFromArea,
} from './parsePixelLog';
import canvases from './canvases';
import {
  imageABGR2Canvas,
  protectCanvasArea,
} from './Image';
import rollbackCanvasArea from './rollback';

/*
 * Execute IP based actions (banning, whitelist, etc.)
 * @param action what to do with the ip
 * @param ip already sanitized ip
 * @return text of success
 */
export async function executeIPAction(action, ips, logger = null) {
  const valueArray = ips.split('\n');
  let out = '';
  for (let i = 0; i < valueArray.length; i += 1) {
    const value = valueArray[i].trim();
    if (!value) {
      continue;
    }

    if (logger) logger(`${action} ${value}`);

    if (action === 'iidtoip') {
      const ip = await getIPofIID(value);
      out += (ip) ? `${ip}\n` : `${value}\n`;
      continue;
    }

    if (action === 'iptoiid') {
      const iid = await getIIDofIP(value);
      out += (iid) ? `${iid}\n` : `${value}\n`;
    }
  }
  return out;
}

/*
 * Execute IID based actions
 * @param action what to do with the iid
 * @param iid already sanitized iid
 * @return text of success
 */
export async function executeIIDAction(
  action,
  iid,
  reason,
  expire,
  muid,
  logger = null,
) {
  const ip = await getIPofIID(iid);
  if (!ip) {
    return `Could not resolve ${iid}`;
  }
  const iidPart = iid.slice(0, iid.indexOf('-'));

  if (logger) logger(`${action} ${iid} ${ip}`);

  switch (action) {
    case 'status': {
      const allowed = await isIPAllowed(ip, true);
      let out = `Allowed to place: ${allowed.allowed}\n`;
      const info = await getInfoToIp(ip);
      out += `Country: ${info.country}\n`
        + `CIDR: ${info.cidr}\n`
        + `org: ${info.org || 'N/A'}\n`
        + `desc: ${info.descr || 'N/A'}\n`
        + `asn: ${info.asn}\n`
        + `proxy: ${info.isProxy}\n`;
      if (info.pcheck) {
        const { pcheck } = info;
        out += `pc: ${pcheck.slice(0, pcheck.indexOf(','))}\n`;
      }
      const whitelisted = await isWhitelisted(ip);
      out += `whitelisted: ${whitelisted}\n`;
      const ban = await getBanInfo(ip);
      if (!ban) {
        out += 'banned: false\n';
      } else {
        out += 'banned: true\n'
          + `reason: ${ban.reason}\n`;
        if (ban.expires) {
          out += `expires: ${ban.expires.toLocaleString()}\n`;
        }
        if (ban.mod) {
          out += `by: @[${ban.mod.name}](${ban.mod.id})\n`;
        }
      }
      return out;
    }
    case 'givecaptcha': {
      const succ = await forceCaptcha(ip);
      if (succ === null) {
        return 'Captchas are deactivated on this server.';
      }
      if (succ) {
        return `Forced captcha on ${iidPart}`;
      }
      return `${iidPart} would have gotten captcha anyway`;
    }
    case 'ban': {
      const expireTs = parseInt(expire, 10);
      if (Number.isNaN(expireTs) || (expireTs && expireTs < Date.now())) {
        return 'No valid expiration time';
      }
      if (!reason || !reason.trim()) {
        return 'No reason specified';
      }
      const ret = await banIP(ip, reason, expireTs || null, muid);
      if (ret) {
        return 'Successfully banned user';
      }
      return 'Updated existing ban of user';
    }
    case 'unban': {
      const ret = await unbanIP(ip);
      if (ret) {
        return 'Successfully unbanned user';
      }
      return 'User is not banned';
    }
    case 'whitelist': {
      const ret = await whitelistIP(ip);
      if (ret) {
        await cleanCacheForIP(ip);
        return 'Successfully whitelisted user';
      }
      return 'User is already whitelisted';
    }
    case 'unwhitelist': {
      const ret = await unwhitelistIP(ip);
      if (ret) {
        await cleanCacheForIP(ip);
        return 'Successfully removed user from whitelist';
      }
      return 'User is not on whitelist';
    }
    default:
      return `Failed to ${action} ${iid}`;
  }
}


/*
 * Execute Image based actions (upload, protect, etc.)
 * @param action what to do with the image
 * @param file imagefile
 * @param coords coord sin X_Y format
 * @param canvasid numerical canvas id as string
 * @return [ret, msg] http status code and message
 */
export async function executeImageAction(
  action,
  file,
  coords,
  canvasid,
  logger = null,
) {
  if (!coords) {
    return [403, 'Coordinates not defined'];
  }
  if (!canvasid) {
    return [403, 'canvasid not defined'];
  }

  const splitCoords = coords.trim().split('_');
  if (splitCoords.length !== 2) {
    return [403, 'Invalid Coordinate Format'];
  }
  const [x, y] = splitCoords.map((z) => Math.floor(Number(z)));

  const canvas = canvases[canvasid];

  let error = null;
  if (Number.isNaN(x)) {
    error = 'x is not a valid number';
  } else if (Number.isNaN(y)) {
    error = 'y is not a valid number';
  } else if (!action) {
    error = 'No imageaction given';
  } else if (!canvas) {
    error = 'Invalid canvas selected';
  } else if (canvas.v) {
    error = 'Can not upload Image to 3D canvas';
  }
  if (error !== null) {
    return [403, error];
  }

  const canvasMaxXY = canvas.size / 2;
  const canvasMinXY = -canvasMaxXY;
  if (x < canvasMinXY || y < canvasMinXY
      || x >= canvasMaxXY || y >= canvasMaxXY) {
    return [403, 'Coordinates are outside of canvas'];
  }

  const protect = (action === 'protect');
  const wipe = (action === 'wipe');

  try {
    const { data, info } = await sharp(file.buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pxlCount = await imageABGR2Canvas(
      canvasid,
      x, y,
      data,
      info.width, info.height,
      wipe, protect,
    );

    // eslint-disable-next-line max-len
    if (logger) logger(`loaded image wth *${pxlCount}*pxls to #${canvas.ident},${x},${y} (+*${x}*+\\_+*${y}*+ - +*${x + info.width - 1}*+\\_+*${y + info.height - 1}*+)`);
    return [
      200,
      `Successfully loaded image wth ${pxlCount}pxls to ${x}/${y}`,
    ];
  } catch {
    return [400, 'Can not read image file'];
  }
}

/*
 * register responses on socket for Watch Actions
 */
socketEvents.onReq('watch', (action, ...args) => {
  try {
    if (action === 'getIIDSummary') {
      return getIIDSummary(...args);
    } if (action === 'getIIDPixels') {
      return getIIDPixels(...args);
    } if (action === 'getSummaryFromArea') {
      return getSummaryFromArea(...args);
    } if (action === 'getPixelsFromArea') {
      return getPixelsFromArea(...args);
    }
  } catch {
    // silently fail when file couldn't be parsed
  }
  return null;
});

/*
 * Check who placed on a canvas area
 * @param action if every pixel or summary should be returned
 * @param ulcoor coords of upper-left corner in X_Y format
 * @param brcoor coords of bottom-right corner in X_Y format
 * @param canvasid numerical canvas id as string
 * @return Object with {info, cols, rows}
 */
export async function executeWatchAction(
  action,
  ulcoor,
  brcoor,
  time,
  iid,
  canvasid,
) {
  if (!canvasid) {
    return { info: 'canvasid not defined' };
  }
  const ts = parseInt(time, 10);
  const canvas = canvases[canvasid];
  let error = null;
  if (!canvas) {
    error = 'Invalid canvas selected';
  } else if (!action) {
    error = 'No cleanaction given';
  } else if (Number.isNaN(ts)) {
    error = 'Invalid time given';
  }
  if (error) {
    return { info: error };
  }

  let ret;
  if (!ulcoor && !brcoor && iid) {
    if (action === 'summary') {
      ret = await socketEvents.req(
        'watch',
        'getIIDSummary',
        iid,
        time,
      );
    }
    if (action === 'all') {
      ret = await socketEvents.req(
        'watch',
        'getIIDPixels',
        iid,
        time,
      );
    }
    if (typeof ret === 'string') {
      return { info: ret };
    }
    if (typeof ret !== 'undefined') {
      return ret;
    }
  }

  const parseCoords = validateCoorRange(ulcoor, brcoor, canvas.size);
  if (typeof parseCoords === 'string') {
    return { info: parseCoords };
  }
  const [x, y, u, v] = parseCoords;

  if ((u - x > 1000 || v - y > 1000)
    && Date.now() - ts > 5 * 60 * 1000
    && !iid
  ) {
    return { info: 'Can not watch so many pixels' };
  }

  if (action === 'summary') {
    ret = await socketEvents.req(
      'watch',
      'getSummaryFromArea',
      canvasid,
      x, y, u, v,
      time,
      iid,
    );
  }
  if (action === 'all') {
    ret = await socketEvents.req(
      'watch',
      'getPixelsFromArea',
      canvasid,
      x, y, u, v,
      time,
      iid,
    );
  }
  if (typeof ret === 'string') {
    return { info: ret };
  }
  if (typeof ret !== 'undefined') {
    return ret;
  }
  return { info: 'Invalid action given' };
}

/*
 * Execute actions for cleaning/filtering canvas
 * @param action what to do
 * @param ulcoor coords of upper-left corner in X_Y format
 * @param brcoor coords of bottom-right corner in X_Y format
 * @param canvasid numerical canvas id as string
 * @return [ret, msg] http status code and message
 */
export async function executeCleanerAction(
  action,
  ulcoor,
  brcoor,
  canvasid,
  logger = null,
) {
  if (!canvasid) {
    return [403, 'canvasid not defined'];
  }
  const canvas = canvases[canvasid];
  let error = null;
  if (!canvas) {
    error = 'Invalid canvas selected';
  } else if (!action) {
    error = 'No cleanaction given';
  }
  if (error) {
    return [403, error];
  }

  const parseCoords = validateCoorRange(ulcoor, brcoor, canvas.size);
  if (typeof parseCoords === 'string') {
    return [403, parseCoords];
  }
  const [x, y, u, v] = parseCoords;

  error = CanvasCleaner.set(canvasid, x, y, u, v, action);
  if (error) {
    return [403, error];
  }
  // eslint-disable-next-line max-len
  const report = `set Canvas Cleaner to *"${action}"* from #${canvas.ident},${x},${y} to #${canvas.ident},${u},${v}`;
  if (logger) logger(report);
  return [200, report];
}

/*
 * Execute actions for protecting areas
 * @param action what to do
 * @param ulcoor coords of upper-left corner in X_Y format
 * @param brcoor coords of bottom-right corner in X_Y format
 * @param canvasid numerical canvas id as string
 * @return [ret, msg] http status code and message
 */
export async function executeProtAction(
  action,
  ulcoor,
  brcoor,
  canvasid,
  logger = null,
) {
  if (!canvasid) {
    return [403, 'canvasid not defined'];
  }
  const canvas = canvases[canvasid];
  let error = null;
  if (!canvas) {
    error = 'Invalid canvas selected';
  } else if (!action) {
    error = 'No imageaction given';
  } else if (action !== 'protect' && action !== 'unprotect') {
    error = 'Invalid action (must be protect or unprotect)';
  }
  if (error !== null) {
    return [403, error];
  }

  const parseCoords = validateCoorRange(ulcoor, brcoor, canvas.size);
  if (typeof parseCoords === 'string') {
    return [403, parseCoords];
  }
  const [x, y, u, v] = parseCoords;

  const width = u - x + 1;
  const height = v - y + 1;
  if (width * height > 10000000) {
    return [403, 'Can not set protection to more than 10m pixels at once'];
  }
  const protect = action === 'protect';
  const pxlCount = await protectCanvasArea(
    canvasid,
    x,
    y,
    width,
    height,
    protect,
  );
  if (logger) {
    logger(
      (protect)
      // eslint-disable-next-line max-len
        ? `protected *${width}*x*${height}* area at #${canvas.ident},${x},${y} with *${pxlCount}*pxls (+*${x}*+\\_+*${y}*+ - +*${u}*+\\_+*${v}*+)`
      // eslint-disable-next-line max-len
        : `unprotect *${width}*x*${height}* area at #${canvas.ident},${x},${y} with *${pxlCount}*pxls (+*${x}*+\\_+*${y}*+ - +*${u}*+\\_+*${v}*+)`,
    );
  }
  return [
    200,
    (protect)
    // eslint-disable-next-line max-len
      ? `Successfully protected ${width}x${height} area at #${canvas.ident},${x},${y} with ${pxlCount}pxls (${ulcoor} - ${brcoor})`
    // eslint-disable-next-line max-len
      : `Successfully unprotected ${width}x${height} area at #${canvas.ident},${x},${y} with ${pxlCount}pxls (${ulcoor} - ${brcoor})`,
  ];
}

/*
 * Execute rollback
 * @param date in format YYYYMMdd
 * @param ulcoor coords of upper-left corner in X_Y format
 * @param brcoor coords of bottom-right corner in X_Y format
 * @param canvasid numerical canvas id as string
 * @return [ret, msg] http status code and message
 */
export async function executeRollback(
  date,
  ulcoor,
  brcoor,
  canvasid,
  logger = null,
  isAdmin = false,
) {
  if (!canvasid) {
    return [403, 'canvasid not defined'];
  }
  const canvas = canvases[canvasid];
  let error = null;
  if (!canvas) {
    error = 'Invalid canvas selected';
  } else if (!date) {
    error = 'No date given';
  } else if (Number.isNaN(Number(date)) || date.length !== 8) {
    error = 'Invalid date';
  }
  if (error !== null) {
    return [403, error];
  }


  const parseCoords = validateCoorRange(ulcoor, brcoor, canvas.size);
  if (typeof parseCoords === 'string') {
    return [403, parseCoords];
  }
  const [x, y, u, v] = parseCoords;

  const width = u - x + 1;
  const height = v - y + 1;
  if (!isAdmin && width * height > 1000000) {
    return [403, 'Can not rollback more than 1m pixels at once'];
  }

  const pxlCount = await rollbackCanvasArea(
    canvasid,
    x,
    y,
    width,
    height,
    date,
  );
  if (logger) {
    logger(
    // eslint-disable-next-line max-len
      `rolled back to *${date}* for *${width}*x*${height}* area at #${canvas.ident},${x},${y} with *${pxlCount}*pxls (+*${x}*+\\_+*${y}*+ - +*${u}*+\\_+*${v}*+)`,
    );
  }
  return [
    200,
    // eslint-disable-next-line max-len
    `Successfully rolled back to ${date} for ${width}x${height} area at #${canvas.ident},${x},${y} with ${pxlCount}pxls (${ulcoor} - ${brcoor})`,
  ];
}

/*
 * Get list of mods
 * @return [[id1, name2], [id2, name2], ...] list
 */
export async function getModList() {
  const mods = await RegUser.findAll({
    where: Sequelize.where(Sequelize.literal('roles & 1'), '!=', 0),
    attributes: ['id', 'name'],
    raw: true,
  });
  return mods.map((mod) => [mod.id, mod.name]);
}

export async function removeMod(userId) {
  if (Number.isNaN(userId)) {
    throw new Error('Invalid userId');
  }
  let user = null;
  try {
    user = await RegUser.findByPk(userId);
  } catch {
    throw new Error('Database error on remove mod');
  }
  if (!user) {
    throw new Error('User not found');
  }
  try {
    await user.update({
      isMod: false,
    });
    return `Moderation rights removed from user ${userId}`;
  } catch {
    throw new Error('Couldn\'t remove Mod from user');
  }
}

export async function makeMod(name) {
  if (!name) {
    throw new Error('No username given');
  }
  let user = null;
  try {
    user = await RegUser.findOne({
      where: {
        name,
      },
    });
  } catch {
    throw new Error(`Invalid user ${name}`);
  }
  if (!user) {
    throw new Error(`User ${name} not found`);
  }
  try {
    await user.update({
      isMod: true,
    });
    return [user.id, user.name];
  } catch {
    throw new Error('Couldn\'t remove Mod from user');
  }
}

