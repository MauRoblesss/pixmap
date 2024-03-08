/*
 * draw pixel on canvas by user
 */

import {
  getPixelFromChunkOffset,
} from './utils';
import logger, { pixelLogger } from './logger';
import allowPlace from '../data/redis/cooldown';
import socketEvents from '../socket/socketEvents';
import { setPixelByOffset } from './setPixel';
import isIPAllowed from './isAllowed';
import canvases from './canvases';

import { THREE_CANVAS_HEIGHT, THREE_TILE_SIZE, TILE_SIZE } from './constants';

let coolDownFactor = 1;
socketEvents.on('setCoolDownFactor', (newFac) => {
  coolDownFactor = newFac;
});

/*
 * IPs who are currently requesting pixels
 * (have to log in order to avoid race conditions)
 */
const curReqIPs = new Map();
setInterval(() => {
  // clean up old data
  const ts = Date.now() - 20 * 1000;
  const ips = [...curReqIPs.keys()];
  for (let i = 0; i < ips.length; i += 1) {
    const ip = ips[i];
    const limiter = curReqIPs.get(ip);
    if (limiter && ts > limiter) {
      curReqIPs.delete(ip);
      logger.warn(
        `Pixel requests from ${ip} got stuck`,
      );
    }
  }
}, 20 * 1000);


/**
 *
 * By Offset is preferred on server side
 * This gets used by websocket pixel placing requests
 * @param user user that can be registered, but doesn't have to
 * @param canvasId
 * @param i Chunk coordinates
 * @param j
 * @param pixels Array of individual pixels within the chunk, with:
 *        [[offset, color], [offset2, color2],...]
 *        Offset is the offset of the pixel within the chunk
 * @param connectedTs Timestamp when connection got established.
 *        if the connection is younger than the cooldown of the canvas,
 *        we fill up the cd on first pixel to nerf one-connection
 *        ip-changing cheaters
 * @return Promise<Object>
 */
export default async function drawByOffsets(
  user,
  canvasId,
  i,
  j,
  pixels,
  connectedTs,
) {
  let wait = 0;
  let coolDown = 0;
  let retCode = 0;
  let pxlCnt = 0;
  let rankedPxlCnt = 0;
  const { ipSub: ip } = user;

  try {
    const startTime = Date.now();

    if (curReqIPs.has(ip)) {
      // already setting a pixel somewhere
      logger.warn(
        `Got simultaneous requests from ${user.ip}`,
      );
      throw new Error(13);
    }
    curReqIPs.set(ip, startTime);

    const canvas = canvases[canvasId];
    if (!canvas) {
      // canvas doesn't exist
      throw new Error(1);
    }

    const canvasSize = canvas.size;
    const is3d = !!canvas.v;

    const tileSize = (is3d) ? THREE_TILE_SIZE : TILE_SIZE;
    /*
     * canvas/chunk validation
     */
    if (i >= canvasSize / tileSize) {
      // x out of bounds
      // (we don't have to check for <0 because it is received as uint)
      throw new Error(2);
    }
    if (j >= canvasSize / tileSize) {
      // y out of bounds
      // (we don't have to check for <0 because it is received as uint)
      throw new Error(3);
    }

    /*
     * userlvl:
     *   0: nothing
     *   1: admin
     *   2: mod
     */
    const isAdmin = (user.userlvl === 1);
    const req = (isAdmin) ? null : canvas.req;
    const clrIgnore = canvas.cli || 0;
    let factor = (isAdmin || (user.userlvl > 0 && pixels[0][1] < clrIgnore))
      ? 0.0 : coolDownFactor;

    // if (user.country === 'tr') {
    //   factor *= 1.4;
    // }

    const bcd = canvas.bcd * factor;
    const pcd = (canvas.pcd) ? canvas.pcd * factor : bcd;
    const userId = user.id;
    const pxlOffsets = [];

    let c_rank = "naa";

    /*
     * validate pixels
     */
    let ranked = canvas.ranked && userId && pcd;
    for (let u = 0; u < pixels.length; u += 1) {
      const [offset, color] = pixels[u];
      pxlOffsets.push(offset);

      const [x, y, z] = getPixelFromChunkOffset(i, j, offset, canvasSize, is3d);
      pixelLogger.info(
        // eslint-disable-next-line max-len
        `${startTime} ${user.ip} ${userId} ${canvasId} ${x} ${y} ${z} ${color}`,
      );

      const maxSize = (is3d) ? tileSize * tileSize * THREE_CANVAS_HEIGHT
        : tileSize * tileSize;
      if (offset >= maxSize) {
        // z out of bounds or weird stuff
        throw new Error(4);
      }

      // admins and mods can place unset pixels
      if (color >= canvas.colors.length
        || (color < clrIgnore
          && user.userlvl === 0
          && !(canvas.v && color === 0))
      ) {
        // color out of bounds
        throw new Error(5);
      }

      /* 3D Canvas Minecraft Avatars */
      // && x >= 96 && x <= 128 && z >= 35 && z <= 100
      // 96 - 128 on x
      // 32 - 128 on z
      if (canvas.v && i === 19 && j >= 17 && j < 20 && !isAdmin) {
        // protected pixel
        throw new Error(8);
      }

      /* dont rank antarctica */
      if (canvasId === 0 && y > 14450) {
        ranked = false;
      }

      if (canvasId === 0) {
        c_rank = canvas.colors[color];
        c_rank = c_rank.toString().replace(')(', '');
      }
    }

    const { cds } = canvas;
    // start with almost filled cd on new connections
    let cdIfNull = cds - pcd + 1000 - startTime + connectedTs;
    if (cdIfNull < 0 || userId || bcd === 0) {
      cdIfNull = 0;
    }

    let needProxycheck;
    [retCode, pxlCnt, wait, coolDown, needProxycheck] = await allowPlace(
      ip,
      userId,
      user.country,
      c_rank,
      ranked,
      canvasId,
      i, j,
      clrIgnore,
      req,
      bcd, pcd,
      cds,
      cdIfNull,
      pxlOffsets,
    );

    if (needProxycheck) {
      const pc = await isIPAllowed(ip, true);
      if (pc.status > 0) {
        pxlCnt = 0;
        switch (pc.status) {
          case 1:
            // proxy
            throw new Error(11);
          case 2:
            // banned
            throw new Error(14);
          case 3:
            // range banned
            throw new Error(15);
          default:
            // nothing
        }
      }
    }

    for (let u = 0; u < pxlCnt; u += 1) {
      const [offset, color] = pixels[u];
      setPixelByOffset(canvasId, color, i, j, offset);
    }

    if (ranked) {
      rankedPxlCnt = pxlCnt;
    }

    const duration = Date.now() - startTime;
    if (duration > 5000) {
      logger.warn(
        // eslint-disable-next-line max-len
        `Long response time of ${duration}ms for placing ${pxlCnt} pixels for user ${user.id || user.ip}`,
      );
    }
  } catch (e) {
    retCode = parseInt(e.message, 10);
    if (Number.isNaN(retCode)) {
      throw e;
    }
  }

  if (retCode !== 13) {
    curReqIPs.delete(ip);
  }

  return {
    wait,
    coolDown,
    pxlCnt,
    rankedPxlCnt,
    retCode,
  };
}
