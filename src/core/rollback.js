/*
 * Rolls back an area of the canvas to a specific date
 *
 */

// Tile creation is allowed to be slow
/* eslint-disable no-await-in-loop */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import RedisCanvas from '../data/redis/RedisCanvas';
import logger from './logger';
import { getChunkOfPixel } from './utils';
import Palette from './Palette';
import { TILE_SIZE } from './constants';
import { BACKUP_DIR } from './config';
import canvases from './canvases';

export default async function rollbackToDate(
  canvasId, // number
  x, // number
  y, // number
  width, // number
  height, // number
  date, // string
) {
  if (!BACKUP_DIR) {
    return 0;
  }
  const dir = path.resolve(__dirname, BACKUP_DIR);
  // eslint-disable-next-line max-len
  const backupDir = `${dir}/${date.slice(0, 4)}/${date.slice(4, 6)}/${date.slice(6)}/${canvasId}/tiles`;
  if (!fs.existsSync(backupDir)) {
    return 0;
  }

  logger.info(
    `Rollback area ${width}/${height} to ${x}/${y}/${canvasId} to date ${date}`,
  );
  const canvas = canvases[canvasId];
  const { colors, size } = canvas;
  const palette = new Palette(colors);
  const canvasMinXY = -(size / 2);

  const [ucx, ucy] = getChunkOfPixel(size, x, y);
  const [lcx, lcy] = getChunkOfPixel(size, x + width, y + height);

  let totalPxlCnt = 0;
  logger.info(`Loading to chunks from ${ucx} / ${ucy} to ${lcx} / ${lcy} ...`);
  let empty = false;
  let emptyBackup = false;
  let backupChunk;
  for (let cx = ucx; cx <= lcx; cx += 1) {
    for (let cy = ucy; cy <= lcy; cy += 1) {
      let chunk = null;
      try {
        chunk = await RedisCanvas.getChunk(canvasId, cx, cy, TILE_SIZE ** 2);
      } catch (error) {
        logger.error(
          // eslint-disable-next-line max-len
          `Chunk ch:${canvasId}:${cx}:${cy} could not be loaded from redis, assuming empty.`,
        );
      }
      if (!chunk || !chunk.length) {
        chunk = new Uint8Array(TILE_SIZE * TILE_SIZE);
        empty = true;
      } else {
        chunk = new Uint8Array(chunk);
        empty = false;
      }
      try {
        emptyBackup = false;
        backupChunk = await sharp(`${backupDir}/${cx}/${cy}.png`)
          .ensureAlpha()
          .raw()
          .toBuffer();
        backupChunk = new Uint32Array(backupChunk.buffer);
      } catch {
        logger.info(
          // eslint-disable-next-line max-len
          `Backup chunk ${backupDir}/${cx}/${cy}.png could not be loaded, assuming empty.`,
        );
        emptyBackup = true;
      }
      let pxlCnt = 0;
      if (!empty || !emptyBackup) {
        // offset of chunk in image
        const cOffX = cx * TILE_SIZE + canvasMinXY - x;
        const cOffY = cy * TILE_SIZE + canvasMinXY - y;
        let cOff = 0;
        for (let py = 0; py < TILE_SIZE; py += 1) {
          for (let px = 0; px < TILE_SIZE; px += 1) {
            const clrX = cOffX + px;
            const clrY = cOffY + py;
            if (clrX >= 0 && clrY >= 0 && clrX < width && clrY < height) {
              const pixel = (emptyBackup)
                ? 0 : palette.abgr.indexOf(backupChunk[cOff]);
              if (pixel !== -1) {
                chunk[cOff] = pixel;
                pxlCnt += 1;
              }
            }
            cOff += 1;
          }
        }
      }
      if (pxlCnt) {
        const ret = await RedisCanvas.setChunk(cx, cy, chunk, canvasId);
        if (ret) {
          logger.info(`Loaded ${pxlCnt} pixels into chunk ${cx}, ${cy}.`);
          totalPxlCnt += pxlCnt;
        }
      }
      chunk = null;
    }
  }
  logger.info('Rollback done.');
  return totalPxlCnt;
}
