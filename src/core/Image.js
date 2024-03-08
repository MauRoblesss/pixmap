/*
 *
 * functions to deal with images
 *
 */

// Tile creation is allowed to be slow
/* eslint-disable no-await-in-loop */

import RedisCanvas from '../data/redis/RedisCanvas';
import logger from './logger';
import { getChunkOfPixel } from './utils';
import { TILE_SIZE } from './constants';
import canvases from './canvases';
import Palette from './Palette';


/*
 * Load image from ABGR buffer onto canvas
 * (be aware that tis function does no validation of arguments)
 * @param canvasId numerical ID of canvas
 * @param x X coordinate on canvas
 * @param y Y coordinate on canvas
 * @param data buffer of image in ABGR format
 * @param width Width of image
 * @param height height of image
 */
export async function imageABGR2Canvas(
  canvasId,
  x,
  y,
  data,
  width,
  height,
  wipe,
  protect,
) {
  logger.info(
    `Loading image with dim ${width}/${height} to ${x}/${y}/${canvasId}`,
  );
  const expectedLength = TILE_SIZE ** 2;
  const canvas = canvases[canvasId];
  const { colors, cli, size } = canvas;
  const palette = new Palette(colors);
  const canvasMinXY = -(size / 2);
  const imageData = new Uint32Array(data.buffer);

  const [ucx, ucy] = getChunkOfPixel(size, x, y);
  const [lcx, lcy] = getChunkOfPixel(size, x + width, y + height);

  let totalPxlCnt = 0;
  logger.info(`Loading to chunks from ${ucx} / ${ucy} to ${lcx} / ${lcy} ...`);
  for (let cx = ucx; cx <= lcx; cx += 1) {
    for (let cy = ucy; cy <= lcy; cy += 1) {
      let chunk = null;
      try {
        chunk = await RedisCanvas.getChunk(canvasId, cx, cy, expectedLength);
      } catch (error) {
        logger.error(
          // eslint-disable-next-line max-len
          `Could not load chunk ch:${canvasId}:${cx}:${cy} for image-load: ${error.message}`,
        );
      }
      chunk = (chunk && chunk.length)
        ? new Uint8Array(chunk)
        : new Uint8Array(TILE_SIZE * TILE_SIZE);
      // offset of chunk in image
      const cOffX = cx * TILE_SIZE + canvasMinXY - x;
      const cOffY = cy * TILE_SIZE + canvasMinXY - y;
      let cOff = 0;
      let pxlCnt = 0;
      for (let py = 0; py < TILE_SIZE; py += 1) {
        for (let px = 0; px < TILE_SIZE; px += 1) {
          const clrX = cOffX + px;
          const clrY = cOffY + py;
          if (clrX >= 0 && clrY >= 0 && clrX < width && clrY < height) {
            const clr = imageData[clrX + clrY * width];
            const clrIndex = (wipe || protect)
              ? palette.abgr.indexOf(clr)
              : palette.abgr.indexOf(clr, cli);
            if (clrIndex !== -1) {
              const pixel = (protect) ? (clrIndex | 0x80) : clrIndex;
              chunk[cOff] = pixel;
              pxlCnt += 1;
            }
          }
          cOff += 1;
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
  logger.info('Image loading done.');
  return totalPxlCnt;
}


/*
 * Load imagemask from ABGR buffer and execute function for each black pixel
 * (be aware that tis function does no validation of arguments)
 * @param canvasId numerical ID of canvas
 * @param x X coordinate on canvas
 * @param y Y coordinate on canvas
 * @param data buffer of image in ABGR format
 * @param width Width of image
 * @param height height of image
 * @param filter function that defines what happens to the pixel that matches,
 *               it will be called with the pixelcolor as argument, its return value gets set
 */
export async function imagemask2Canvas(
  canvasId,
  x,
  y,
  data,
  width,
  height,
  filter,
) {
  logger.info(
    `Loading mask with size ${width} / ${height} to ${x} / ${y} to the canvas`,
  );
  const expectedLength = TILE_SIZE ** 2;
  const canvas = canvases[canvasId];
  const palette = new Palette(canvas.colors);
  const canvasMinXY = -(canvas.size / 2);

  const imageData = new Uint8Array(data.buffer);

  const [ucx, ucy] = getChunkOfPixel(canvas.size, x, y);
  const [lcx, lcy] = getChunkOfPixel(canvas.size, x + width, y + height);

  logger.info(`Loading to chunks from ${ucx} / ${ucy} to ${lcx} / ${lcy} ...`);
  for (let cx = ucx; cx <= lcx; cx += 1) {
    for (let cy = ucy; cy <= lcy; cy += 1) {
      let chunk = null;
      try {
        chunk = await RedisCanvas.getChunk(canvasId, cx, cy, expectedLength);
      } catch (error) {
        logger.error(
          // eslint-disable-next-line max-len
          `Could not load chunk ch:${canvasId}:${cx}:${cy} for imagemask-load: ${error.message}`,
        );
      }
      chunk = (chunk && chunk.length)
        ? new Uint8Array(chunk)
        : new Uint8Array(TILE_SIZE * TILE_SIZE);
      // offset of chunk in image
      const cOffX = cx * TILE_SIZE + canvasMinXY - x;
      const cOffY = cy * TILE_SIZE + canvasMinXY - y;
      let cOff = 0;
      let pxlCnt = 0;
      for (let py = 0; py < TILE_SIZE; py += 1) {
        for (let px = 0; px < TILE_SIZE; px += 1) {
          const clrX = cOffX + px;
          const clrY = cOffY + py;
          if (clrX >= 0 && clrY >= 0 && clrX < width && clrY < height) {
            let offset = (clrX + clrY * width) * 3;
            if (!imageData[offset++]
              && !imageData[offset++]
              && !imageData[offset]
            ) {
              chunk[cOff] = filter(palette.abgr[chunk[cOff]]);
              pxlCnt += 1;
            }
          }
          cOff += 1;
        }
      }
      if (pxlCnt) {
        const ret = await RedisCanvas.setChunk(cx, cy, chunk, canvasId);
        if (ret) {
          logger.info(`Loaded ${pxlCnt} pixels into chunk ${cx}, ${cy}.`);
        }
      }
      chunk = null;
    }
  }
  logger.info('Imagemask loading done.');
}


/*
 * Set an area of the canvas to protected
 * @param canvasId numerical ID of canvas
 * @param x X coordinate on canvas
 * @param y Y coordinate on canvas
 * @param width Width of image
 * @param height height of image
 */
export async function protectCanvasArea(
  canvasId,
  x,
  y,
  width,
  height,
  protect = true,
) {
  logger.info(
    // eslint-disable-next-line max-len
    `Setting protection ${protect} with size ${width} / ${height} to ${x} / ${y}`,
  );
  const expectedLength = TILE_SIZE ** 2;
  const canvas = canvases[canvasId];
  const canvasMinXY = -(canvas.size / 2);

  const [ucx, ucy] = getChunkOfPixel(canvas.size, x, y);
  const [lcx, lcy] = getChunkOfPixel(
    canvas.size, x + width - 1,
    y + height - 1,
  );

  let totalPxlCnt = 0;
  for (let cx = ucx; cx <= lcx; cx += 1) {
    for (let cy = ucy; cy <= lcy; cy += 1) {
      let chunk = null;
      try {
        chunk = await RedisCanvas.getChunk(canvasId, cx, cy, expectedLength);
      } catch (error) {
        logger.error(
          // eslint-disable-next-line max-len
          `Could not load chunk ch:${canvasId}:${cx}:${cy} for protection: ${error.message}`,
        );
      }
      if (!chunk || !chunk.length) {
        continue;
      }
      chunk = new Uint8Array(chunk);
      // offset of area in chunk
      const cOffX = x - cx * TILE_SIZE - canvasMinXY;
      const cOffY = y - cy * TILE_SIZE - canvasMinXY;
      const cOffXE = cOffX + width;
      const cOffYE = cOffY + height;
      const startX = (cOffX > 0) ? cOffX : 0;
      const startY = (cOffY > 0) ? cOffY : 0;
      const endX = (cOffXE >= TILE_SIZE) ? TILE_SIZE : cOffXE;
      const endY = (cOffYE >= TILE_SIZE) ? TILE_SIZE : cOffYE;
      let pxlCnt = 0;
      for (let py = startY; py < endY; py += 1) {
        for (let px = startX; px < endX; px += 1) {
          const offset = px + py * TILE_SIZE;
          if (protect) {
            chunk[offset] |= 0x80;
          } else {
            chunk[offset] &= 0x7F;
          }
          pxlCnt += 1;
        }
      }
      if (pxlCnt) {
        const ret = await RedisCanvas.setChunk(cx, cy, chunk, canvasId);
        if (ret) {
          // eslint-disable-next-line max-len
          logger.info(`Set protection for ${pxlCnt} pixels in chunk ${cx}, ${cy}.`);
          totalPxlCnt += pxlCnt;
        }
      }
      chunk = null;
    }
  }
  logger.info('Setting protection for area done.');
  return totalPxlCnt;
}
