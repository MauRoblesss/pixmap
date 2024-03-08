/*
 * this script takes black/whtie tiles and sets their colors on the canvas
 * its used to set the land area on the planet.
 */


import { createClient, commandOptions } from 'redis';
import sharp from 'sharp';
import fs from 'fs';
import canvases from '../../src/canvases.json';
import { getChunkOfPixel } from '../../src/core/utils';

// -----------------------------------------------------------------------------

const CANVAS_SIZE = 256 * 256;
const TILE_SIZE = 256;
const TILEFOLDER = './utils/ocean-tiles/ocean';
const IMG_TILE_SIZE = 2048;
// change redis URL here if you need a different one
const redis = createClient({ url: "redis://localhost:6379" });

// -----------------------------------------------------------------------------

const CANVAS_MIN_XY = -(CANVAS_SIZE / 2);
const CANVAS_MAX_XY = (CANVAS_SIZE / 2) - 1;

/**
 * get Chunk from redis, pad if neccessary
 */
async function getChunk(
  canvasId,
  i,
  j,
  padding = null,
) {
  const key = `ch:${canvasId}:${i}:${j}`;
  let chunk = await redis.get(
    commandOptions({ returnBuffers: true }),
    key,
  );
  if (padding > 0 && chunk && chunk.length < padding) {
    const pad = Buffer.alloc(padding - chunk.length);
    chunk = Buffer.concat([chunk, pad]);
  }
  return chunk;
}

/**
 * Load imagemask from ABGR buffer and execute filter function
 * for each black pixel
 */
async function imagemask2Canvas(
  canvasId,
  x,
  y,
  data,
  width,
  height,
  filter,
) {
  console.info(
    `Loading mask with size ${width} / ${height} to ${x} / ${y} to the canvas`,
  );
  const expectedLength = TILE_SIZE ** 2;
  const canvas = canvases[canvasId];
  const canvasMinXY = -(canvas.size / 2);

  const imageData = new Uint8Array(data.buffer);

  const [ucx, ucy] = getChunkOfPixel(canvas.size, x, y);
  const [lcx, lcy] = getChunkOfPixel(canvas.size, x + width, y + height);

  console.info(`Loading to chunks from ${ucx} / ${ucy} to ${lcx} / ${lcy} ...`);
  for (let cx = ucx; cx <= lcx; cx += 1) {
    for (let cy = ucy; cy <= lcy; cy += 1) {
      let chunk = null;
      try {
        chunk = await getChunk(canvasId, cx, cy, expectedLength);
      } catch (error) {
        console.error(
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
              chunk[cOff] = filter();
              pxlCnt += 1;
            }
          }
          cOff += 1;
        }
      }
      if (pxlCnt) {
        const key = `ch:${canvasId}:${cx}:${cy}`;
        const ret = await redis.set(key, Buffer.from(chunk.buffer));
        if (ret) {
          console.info(`Loaded ${pxlCnt} pixels into chunk ${cx}, ${cy}.`);
        }
      }
      chunk = null;
    }
  }
  console.info('Imagemask loading done.');
}

/**
 * Load black/white tiles from TILEFOLDER onto canvas
 */
async function applyMasks() {
  await redis.connect();
  try {
    for (let ty = 0; ty < CANVAS_SIZE / IMG_TILE_SIZE; ty += 1) {
      for (let tx = 0; tx < CANVAS_SIZE / IMG_TILE_SIZE; tx += 1) {
        const [ x, y ] = [tx, ty].map(z => z * IMG_TILE_SIZE + CANVAS_MIN_XY);
        const filename = `${TILEFOLDER}/${tx}/${ty}.png`;
        console.log(`Checking tile ${filename}`);
        if (!fs.existsSync(filename)) {
            console.log(`Not Found ${filename}`);
            continue;
        }
        let tile = await sharp(filename).removeAlpha().raw().toBuffer();
        // eslint-disable-next-line max-len
        await imagemask2Canvas(0, x, y, tile, IMG_TILE_SIZE, IMG_TILE_SIZE, () => {
          return 1; //set color to index 1 -> land
        });
        tile = null;
      }
      if (global?.gc) {
        global.gc();
      }
    }
    await redis.quit();
    process.exit(0);
  } catch (err) {
    console.error(err);
    await redis.quit();
    process.exit(1);
  }
}

applyMasks();
