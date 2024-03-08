/*
 * server package hydration
 */
import {
  CAPTCHA_RETURN_OP,
  CHANGE_ME_OP,
  CHUNK_UPDATE_MB_OP,
  COOLDOWN_OP,
  ONLINE_COUNTER_OP,
  PIXEL_RETURN_OP,
  PIXEL_UPDATE_MB_OP,
  PIXEL_UPDATE_OP,
} from './op';

/*
 * data in hydrate function is a nodejs Buffer
 */

/*
* @return canvasId
*/
export function hydrateRegCanvas(data) {
  return data[1];
}

/*
 * @return {
 *   total: totalOnline,
 *   canvasId: online,
 *   ....
 * }
 */
export function hydrateOnlineCounter(data) {
  const online = {};
  online.total = data.readUInt16BE(1);
  let off = data.length;
  while (off > 3) {
    const onlineUsers = data.readUInt16BE(off -= 2);
    const canvas = data.readUInt8(off -= 1);
    online[canvas] = onlineUsers;
  }
  return online;
}

/*
* @return chunkId
*/
export function hydrateRegChunk(data) {
  return data[1] << 8 | data[2];
}

/*
* @return chunkId
*/
export function hydrateDeRegChunk(data) {
  return data[1] << 8 | data[2];
}

/*
* cb execute with individual chunkids
*/
export function hydrateRegMChunks(data, cb) {
  let posu = 2;
  while (posu < data.length) {
    const chunkid = data[posu++] | data[posu++] << 8;
    cb(chunkid);
  }
}

/*
* cb execute with individual chunkids
*/
export function hydrateDeRegMChunks(data, cb) {
  let posl = 2;
  while (posl < data.length) {
    const chunkid = data[posl++] | data[posl++] << 8;
    cb(chunkid);
  }
}

/*
* @return chunk id and array of pixel offset and color
*/
export function hydratePixelUpdate(data) {
  const i = data.readUInt8(1);
  const j = data.readUInt8(2);
  const pixels = [];
  let off = data.length;
  let pxlcnt = 0;
  while (off > 3 && pxlcnt < 500) {
    const color = data.readUInt8(off -= 1);
    const offsetL = data.readUInt16BE(off -= 2);
    const offsetH = data.readUInt8(off -= 1) << 16;
    pixels.push([offsetH | offsetL, color]);
    pxlcnt += 1;
  }
  return {
    i, j, pixels,
  };
}

/*
* @returns info and PixelUpdate package to send to clients
*/
export function hydratePixelUpdateMB(data) {
  const canvasId = data[1];
  data.writeUInt8(PIXEL_UPDATE_OP, 1);
  const chunkId = data.readUInt16BE(2);
  const pixelUpdate = Buffer.from(
    data.buffer,
    data.byteOffset + 1,
    data.length - 1,
  );
  return [
    canvasId,
    chunkId,
    pixelUpdate,
  ];
}

/*
* @return canvasid and chunk coords
*/
export function hydrateChunkUpdateMB(data) {
  const canvasId = data[1];
  const i = data.readUInt8(2);
  const j = data.readUInt8(3);
  return [canvasId, [i, j]];
}

/*
 * dehydrate functions return nodejs Buffer object
 */

/*
 * returns buffer with only OP_CODE
 */
export function dehydrateChangeMe() {
  return Buffer.from([CHANGE_ME_OP]);
}

/*
 * @param {
 *   total: totalOnline,
 *   canvasId: online,
 *   ....
 * }
 */
export function dehydrateOnlineCounter(online) {
  const canvasIds = Object.keys(online).filter((id) => id !== 'total');
  const buffer = Buffer.allocUnsafe(3 + canvasIds.length * (1 + 2));
  buffer.writeUInt8(ONLINE_COUNTER_OP, 0);
  buffer.writeUInt16BE(online.total, 1);
  let cnt = 1;
  for (let p = 0; p < canvasIds.length; p += 1) {
    const canvasId = canvasIds[p];
    const onlineUsers = online[canvasId];
    buffer.writeUInt8(Number(canvasId), cnt += 2);
    buffer.writeUInt16BE(onlineUsers, cnt += 1);
  }
  return buffer;
}

/*
 * @param chunkId id consisting of chunk coordinates
 * @param pixels Buffer with offset and color of one or more pixels
 */
export function dehydratePixelUpdate(i, j, pixels) {
  const index = new Uint8Array([PIXEL_UPDATE_OP, i, j]);
  return Buffer.concat([index, pixels]);
}

/*
 * @param canvasId
 * @param chunkId id consisting of chunk coordinates
 * @param pixels Buffer with offset and color of one or more pixels
 */
export function dehydratePixelUpdateMB(canvasId, i, j, pixels) {
  const index = new Uint8Array([
    PIXEL_UPDATE_MB_OP,
    canvasId,
    i,
    j,
  ]);
  return Buffer.concat([index, pixels]);
}

/*
 * @param wait cooldown in ms
 */
export function dehydrateCoolDown(wait) {
  const buffer = Buffer.allocUnsafe(1 + 4);
  buffer.writeUInt8(COOLDOWN_OP, 0);
  buffer.writeUInt32BE(wait, 1);
  return buffer;
}

/*
 * for params see core/draw or ui/placePixel
 */
export function dehydratePixelReturn(
  retCode,
  wait,
  coolDown,
  pxlCnt,
  rankedPxlCnt,
) {
  const buffer = Buffer.allocUnsafe(1 + 1 + 4 + 2 + 1 + 1);
  buffer.writeUInt8(PIXEL_RETURN_OP, 0);
  buffer.writeUInt8(retCode, 1);
  buffer.writeUInt32BE(wait, 2);
  const coolDownSeconds = Math.round(coolDown / 1000);
  buffer.writeInt16BE(coolDownSeconds, 6);
  buffer.writeUInt8(pxlCnt, 8);
  buffer.writeUInt8(rankedPxlCnt, 9);
  return buffer;
}

export function dehydrateCaptchaReturn(retCode) {
  return Buffer.from([CAPTCHA_RETURN_OP, retCode]);
}

/*
 * @param canvasId
 * @param Array with chunk coordinates
 */
export function dehydrateChunkUpdateMB(canvasId, [i, j]) {
  return Buffer.from([
    CHUNK_UPDATE_MB_OP,
    canvasId,
    i,
    j,
  ]);
}
