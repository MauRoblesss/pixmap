/*
 * canvas data on redis
 */
import { commandOptions } from 'redis';

import { getChunkOfPixel, getOffsetOfPixel } from '../../core/utils';
import socketEvents from '../../socket/socketEvents';
import client from './client';


const UINT_SIZE = 'u8';

class RedisCanvas {
  /*
   * Get chunk from redis
   * canvasId integer id of canvas
   * i, j chunk coordinates
   * [padding] required length of chunk  (will be padded with zeros if smaller)
   * @return chunk as Buffer
   */
  static async getChunk(
    canvasId,
    i,
    j,
    padding = null,
  ) {
    // this key is also hardcoded into
    // core/tilesBackup.js
    const key = `ch:${canvasId}:${i}:${j}`;
    let chunk = await client.get(
      commandOptions({ returnBuffers: true }),
      key,
    );
    if (padding > 0 && chunk && chunk.length < padding) {
      /*
       * this padding is slow and should be avoided,
       * better deal with non-full-size chunks yourself
       */
      const pad = Buffer.alloc(padding - chunk.length);
      chunk = Buffer.concat([chunk, pad]);
    }
    return chunk;
  }

  static async setChunk(i, j, chunk, canvasId) {
    const key = `ch:${canvasId}:${i}:${j}`;
    await client.set(key, Buffer.from(chunk.buffer));
    socketEvents.broadcastChunkUpdate(canvasId, [i, j]);
    return true;
  }

  static async delChunk(i, j, canvasId) {
    const key = `ch:${canvasId}:${i}:${j}`;
    await client.del(key);
    socketEvents.broadcastChunkUpdate(canvasId, [i, j]);
    return true;
  }

  multi = null;

  static enqueuePixel(
    canvasId,
    color,
    i,
    j,
    offset,
  ) {
    if (!RedisCanvas.multi) {
      RedisCanvas.multi = client.multi();
      setTimeout(RedisCanvas.flushPixels, 100);
    }

    RedisCanvas.multi.addCommand(
      /*
       * NOTE:
       * If chunk doesn't exist or is smaller than the offset,
       * redis will pad with zeros
       * https://redis.io/commands/bitfield/
       */
      [
        'BITFIELD',
        `ch:${canvasId}:${i}:${j}`,
        'SET',
        UINT_SIZE,
        `#${offset}`,
        String(color),
      ],
    );
  }

  static flushPixels() {
    if (RedisCanvas.multi) {
      const { multi } = RedisCanvas;
      RedisCanvas.multi = null;
      // true for execAsPipeline
      return multi.exec(true);
    }
    return null;
  }

  static async getPixelIfExists(
    canvasId,
    i,
    j,
    offset,
  ) {
    // 1st bit -> protected or not
    // 2nd bit -> unused
    // rest (6 bits) -> index of color
    const args = [
      'BITFIELD',
      `ch:${canvasId}:${i}:${j}`,
      'GET',
      UINT_SIZE,
      `#${offset}`,
    ];
    const result = await client.sendCommand(args);
    if (!result) return null;
    const color = result[0];
    return color;
  }

  static async getPixelByOffset(
    canvasId,
    i,
    j,
    offset,
  ) {
    const clr = RedisCanvas.getPixelIfExists(canvasId, i, j, offset);
    return (clr == null) ? 0 : clr;
  }

  static async getPixel(
    canvasId,
    canvasSize,
    x,
    y,
    z = null,
  ) {
    const [i, j] = getChunkOfPixel(canvasSize, x, y, z);
    const offset = getOffsetOfPixel(canvasSize, x, y, z);

    const clr = RedisCanvas.getPixelIfExists(canvasId, i, j, offset);
    return (clr == null) ? 0 : clr;
  }
}


export default RedisCanvas;
