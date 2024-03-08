/*
 * basic functions for creating zoomed tiles
 * Used by tilewriter worker thread, so dont import too much.
 *
 * */

/* eslint-disable no-console */

// Tile creation is allowed to be slow
/* eslint-disable no-await-in-loop */

import sharp from 'sharp';
import fs from 'fs';

import RedisCanvas from '../data/redis/RedisCanvas';
import Palette from './Palette';
import { getMaxTiledZoom } from './utils';
import { TILE_SIZE, TILE_ZOOM_LEVEL } from './constants';

/*
 * Deletes a subtile from a tile (paints it in color 0),
 * if we wouldn't do it, it would be black
 * @param tileSize size of the tile within the chunk
 * @param palette Palette to use
 * @param subtilesInTile how many subtiles are in a tile (per dimension)
 * @param cell subtile to delete [dx, dy]
 * @param buffer Uint8Array for RGB values of tile
 */
function deleteSubtilefromTile(
  tileSize,
  palette,
  subtilesInTile,
  cell,
  buffer,
) {
  const [dx, dy] = cell;
  const offset = (dx + dy * tileSize * subtilesInTile) * tileSize;
  const [blankR, blankG, blankB] = palette.rgb;
  for (let row = 0; row < tileSize; row += 1) {
    let channelOffset = (offset + row * tileSize * subtilesInTile) * 3;
    const max = channelOffset + tileSize * 3;
    while (channelOffset < max) {
      buffer[channelOffset++] = blankR;
      buffer[channelOffset++] = blankG;
      buffer[channelOffset++] = blankB;
    }
  }
}

/*
 * adds an RGB tile as a shrunken tile to another
 * @param subtilesInTile width of a subtile compared to the tile (power of 2)
 * @param cell subtile coordinates [dx, dy]
 * @param inpTile input tile
 * @param tile output tile
 */
function addShrunkenSubtileToTile(
  subtilesInTile,
  cell,
  inpTile,
  tile,
) {
  const tileSize = TILE_SIZE;
  const [dx, dy] = cell;
  const target = tileSize / subtilesInTile;
  const offset = (dx + dy * tileSize) * target;
  let posA = 0;
  let posB;
  const pxlPad = (subtilesInTile - 1) * 3;
  const linePad = (tileSize * (subtilesInTile - 1) - 1) * 3;
  for (let row = 0; row < target; row += 1) {
    let channelOffset = (offset + row * tileSize) * 3;
    const max = channelOffset + target * 3;
    while (channelOffset < max) {
      const tr = inpTile[posA++];
      const tg = inpTile[posA++];
      const tb = inpTile[posA++];
      posA += pxlPad;
      posB = posA + linePad;
      tile[channelOffset++] = (inpTile[posB++] + tr) >>> 1;
      tile[channelOffset++] = (inpTile[posB++] + tg) >>> 1;
      tile[channelOffset++] = (inpTile[posB] + tb) >>> 1;
    }
    posA = posB + 1;
  }
}

/*
 * this was a failed try, it ended up being slow
 * and low quality
function addShrunkenIndexedSubtilesToTile(
  palette,
  tileSize,
  subtilesInTile,
  cell,
  inpTile,
  buffer,
) {
  const [dx, dy] = cell;
  const subtileSize = tileSize / subtilesInTile;
  const inpTileLength = inpTile.length;
  const offset = (dx + dy * tileSize) * subtileSize;
  const { rgb } = palette;
  let tr;
  let tg;
  let tb;
  let channelOffset;
  let posA;
  let posB;
  let clr;
  const linePad = (tileSize + 1) * (subtilesInTile - 1);
  let amountFullRows = Math.floor(inpTileLength / subtilesInTile);
  // use available data
  for (let row = 0; row < amountFullRows; row += 1) {
    channelOffset = (offset + row * tileSize) * 3;
    const max = channelOffset + subtileSize * 3;
    posA = row * tileSize * subtilesInTile;
    posB = posA + linePad;
    while (channelOffset < max) {
      clr = (inpTile[posA] & 0x3F) * 3;
      tr = rgb[clr++];
      tg = rgb[clr++];
      tb = rgb[clr];
      posA += subtilesInTile;
      clr = (inpTile[posB] & 0x3F) * 3;
      buffer[channelOffset++] = (rgb[clr++] + tr) / 2;
      buffer[channelOffset++] = (rgb[clr++] + tg) / 2;
      buffer[channelOffset++] = (rgb[clr] + tb) / 2;
      posB += subtilesInTile;
    }
  }
  // padding the rest
  [tr, tg, tb] = rgb;
  if (inpTileLength % subtilesInTile) {
    channelOffset = (offset + amountFullRows * tileSize) * 3;
    const max = channelOffset + subtileSize * 3;
    posA = amountFullRows * tileSize * subtilesInTile;
    while (channelOffset < max) {
      if (posA < inpTileLength) {
        clr = (inpTile[posA] & 0x3F) * 3;
        buffer[channelOffset++] = (rgb[clr++] + tr) / 2;
        buffer[channelOffset++] = (rgb[clr++] + tg) / 2;
        buffer[channelOffset++] = (rgb[clr] + tb) / 2;
        posA += subtilesInTile;
      } else {
        buffer[channelOffset++] = tr;
        buffer[channelOffset++] = tg;
        buffer[channelOffset++] = tb;
      }
    }
    amountFullRows += 1;
  }
  if (amountFullRows < subtileSize) {
    for (let row = amountFullRows; row < subtileSize; row += 1) {
      channelOffset = (offset + row * tileSize) * 3;
      const max = channelOffset + subtileSize * 3;
      while (channelOffset < max) {
        buffer[channelOffset++] = tr;
        buffer[channelOffset++] = tg;
        buffer[channelOffset++] = tb;
      }
    }
  }
}
*/

/*
 * @param subtilesInTile how many subtiles are in a tile (per dimension)
 * @param cell where to add the tile [dx, dy]
 * @param subtile RGB buffer of subtile
 * @param buffer Uint8Array for RGB values of tile
 */
function addRGBSubtiletoTile(
  subtilesInTile,
  cell,
  subtile,
  buffer,
) {
  const tileSize = TILE_SIZE;
  const [dx, dy] = cell;
  const chunkOffset = (dx + dy * subtilesInTile * tileSize) * tileSize;
  let pos = 0;
  for (let row = 0; row < tileSize; row += 1) {
    let channelOffset = (chunkOffset + row * tileSize * subtilesInTile) * 3;
    const max = channelOffset + tileSize * 3;
    while (channelOffset < max) {
      buffer[channelOffset++] = subtile[pos++];
      buffer[channelOffset++] = subtile[pos++];
      buffer[channelOffset++] = subtile[pos++];
    }
  }
}

/*
 * @param palette Palette to use
 * @param subtilesInTile how many subtiles are in a tile (per dimension)
 * @param cell subtile to delete [dx, dy]
 * @param subtile RGB buffer of subtile
 * @param buffer RGB Buffer of tile
 */
function addIndexedSubtiletoTile(
  palette,
  subtilesInTile,
  cell,
  subtile,
  buffer,
) {
  const tileSize = TILE_SIZE;
  const [dx, dy] = cell;
  const chunkOffset = (dx + dy * subtilesInTile * tileSize) * tileSize;

  const { rgb } = palette;
  const emptyR = rgb[0];
  const emptyG = rgb[1];
  const emptyB = rgb[2];

  let pos = 0;
  let clr;
  for (let row = 0; row < tileSize; row += 1) {
    let channelOffset = (chunkOffset + row * tileSize * subtilesInTile) * 3;
    const max = channelOffset + tileSize * 3;
    while (channelOffset < max) {
      if (pos < subtile.length) {
        clr = (subtile[pos++] & 0x3F) * 3;
        buffer[channelOffset++] = rgb[clr++];
        buffer[channelOffset++] = rgb[clr++];
        buffer[channelOffset++] = rgb[clr];
      } else {
        buffer[channelOffset++] = emptyR;
        buffer[channelOffset++] = emptyG;
        buffer[channelOffset++] = emptyB;
      }
    }
  }
}

/*
 * @param canvasTileFolder root folder where to save tiles
 * @param cell tile [z, x, y]
 * @return filename of tile
 */
function tileFileName(canvasTileFolder, cell) {
  const [z, x, y] = cell;
  const filename = `${canvasTileFolder}/${z}/${x}/${y}.webp`;
  try {
    const mtime = new Date(fs.statSync(filename).mtime).getTime();
    if (Date.now() - mtime < 120000) {
      return null;
    }
  } catch {
    // file doesn't exist
  }
  return filename;
}

/*
 * @param canvasId id of the canvas
 * @param canvas canvas data
 * @param canvasTileFolder root folder where to save tiles
 * @param cell tile to create [x, y]
 * @return true if successfully created tile, false if tile empty
 */
export async function createZoomTileFromChunk(
  canvasId,
  canvas,
  canvasTileFolder,
  cell,
  gPalette = null,
) {
  const palette = gPalette || new Palette(canvas.colors);
  const canvasSize = canvas.size;
  const [x, y] = cell;
  const maxTiledZoom = getMaxTiledZoom(canvasSize);

  const filename = tileFileName(canvasTileFolder, [maxTiledZoom - 1, x, y]);
  if (!filename) return true;

  const tileRGBBuffer = new Uint8Array(
    TILE_SIZE * TILE_SIZE * TILE_ZOOM_LEVEL * TILE_ZOOM_LEVEL * 3,
  );
  const startTime = Date.now();

  const xabs = x * TILE_ZOOM_LEVEL;
  const yabs = y * TILE_ZOOM_LEVEL;
  const na = [];

  const prom = async (dx, dy) => {
    try {
      const chunk = await RedisCanvas.getChunk(
        canvasId,
        xabs + dx,
        yabs + dy,
      );
      if (!chunk || !chunk.length) {
        na.push([dx, dy]);
        return;
      }
      addIndexedSubtiletoTile(
        palette,
        TILE_ZOOM_LEVEL,
        [dx, dy],
        chunk,
        tileRGBBuffer,
      );
    } catch (error) {
      na.push([dx, dy]);
      console.error(
        // eslint-disable-next-line max-len
        `Tiling: Failed to get Chunk ch:${canvasId}:${xabs + dx}${yabs + dy} with error ${error.message}`,
      );
    }
  };

  const promises = [];
  for (let dy = 0; dy < TILE_ZOOM_LEVEL; dy += 1) {
    for (let dx = 0; dx < TILE_ZOOM_LEVEL; dx += 1) {
      promises.push(prom(dx, dy));
    }
  }
  await Promise.all(promises);

  if (na.length !== TILE_ZOOM_LEVEL * TILE_ZOOM_LEVEL) {
    na.forEach((element) => {
      deleteSubtilefromTile(
        TILE_SIZE,
        palette,
        TILE_ZOOM_LEVEL,
        element,
        tileRGBBuffer,
      );
    });

    try {
      await sharp(tileRGBBuffer, {
        raw: {
          width: TILE_SIZE * TILE_ZOOM_LEVEL,
          height: TILE_SIZE * TILE_ZOOM_LEVEL,
          channels: 3,
        },
      })
        .resize(TILE_SIZE)
        .webp({ quality: 100, smartSubsample: true })
        .toFile(filename);
    } catch (error) {
      console.error(
        `Tiling: Error on createZoomTileFromChunk: ${error.message}`,
      );
      return false;
    }
    console.log(
      // eslint-disable-next-line max-len
      `Tiling: Created Tile ${filename} with ${na.length} empty chunks in ${Date.now() - startTime}ms`,
    );
    return true;
  }
  return false;
}

/*
 * @param canvas canvas data
 * @param canvasTileFolder root folder where to save tiles
 * @param cell tile to create [z, x, y]
 * @return trie if successfully created tile, false if tile empty
 */
export async function createZoomedTile(
  canvas,
  canvasTileFolder,
  cell,
  gPalette = null,
) {
  const palette = gPalette || new Palette(canvas.colors);
  const tileRGBBuffer = new Uint8Array(
    TILE_SIZE * TILE_SIZE * 3,
  );
  const [z, x, y] = cell;

  const filename = tileFileName(canvasTileFolder, [z, x, y]);
  if (!filename) return true;

  const startTime = Date.now();
  const na = [];

  const prom = async (dx, dy) => {
    // eslint-disable-next-line max-len
    const chunkfile = `${canvasTileFolder}/${z + 1}/${x * TILE_ZOOM_LEVEL + dx}/${y * TILE_ZOOM_LEVEL + dy}.webp`;
    try {
      if (!fs.existsSync(chunkfile)) {
        na.push([dx, dy]);
        return;
      }
      const chunk = await sharp(chunkfile).removeAlpha().raw().toBuffer();
      addShrunkenSubtileToTile(
        TILE_ZOOM_LEVEL,
        [dx, dy],
        chunk,
        tileRGBBuffer,
      );
    } catch (error) {
      na.push([dx, dy]);
      console.error(
        // eslint-disable-next-line max-len
        `Tiling: Error on createZoomedTile on chunk ${chunkfile}: ${error.message}`,
      );
    }
  };

  const promises = [];
  for (let dy = 0; dy < TILE_ZOOM_LEVEL; dy += 1) {
    for (let dx = 0; dx < TILE_ZOOM_LEVEL; dx += 1) {
      promises.push(prom(dx, dy));
    }
  }
  await Promise.all(promises);

  if (na.length !== TILE_ZOOM_LEVEL * TILE_ZOOM_LEVEL) {
    na.forEach((element) => {
      deleteSubtilefromTile(
        TILE_SIZE / TILE_ZOOM_LEVEL,
        palette,
        TILE_ZOOM_LEVEL,
        element,
        tileRGBBuffer,
      );
    });

    try {
      await sharp(tileRGBBuffer, {
        raw: {
          width: TILE_SIZE,
          height: TILE_SIZE,
          channels: 3,
        },
      })
        .webp({ quality: 100, smartSubsample: true })
        .toFile(filename);
    } catch (error) {
      console.error(
        `Tiling: Error on createZoomedTile: ${error.message}`,
      );
      return false;
    }
    console.log(
      // eslint-disable-next-line max-len
      `Tiling: Created tile ${filename} with ${na.length} empty subtiles in ${Date.now() - startTime}ms.`,
    );
    return true;
  }
  return false;
}

/*
 * create an empty image tile with just one color
 * @param canvasTileFolder root folder where to save texture
 * @param palette Palette to use
 */
async function createEmptyTile(
  canvasTileFolder,
  palette,
) {
  const tileRGBBuffer = new Uint8Array(
    TILE_SIZE * TILE_SIZE * 3,
  );
  let i = 0;
  const max = TILE_SIZE * TILE_SIZE * 3;
  while (i < max) {
    // eslint-disable-next-line prefer-destructuring
    tileRGBBuffer[i++] = palette.rgb[0];
    // eslint-disable-next-line prefer-destructuring
    tileRGBBuffer[i++] = palette.rgb[1];
    // eslint-disable-next-line prefer-destructuring
    tileRGBBuffer[i++] = palette.rgb[2];
  }
  const filename = `${canvasTileFolder}/emptytile.webp`;
  try {
    await sharp(tileRGBBuffer, {
      raw: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        channels: 3,
      },
    })
      .webp({ quality: 100, smartSubsample: true })
      .toFile(filename);
  } catch (error) {
    console.error(
      `Tiling: Error on createEmptyTile: ${error.message}`,
    );
    return;
  }
  console.log(`Tiling: Created empty tile at ${filename}`);
}

/*
 * created 4096x4096 texture of default canvas
 * @param canvasId numerical Id of canvas
 * @param canvas canvas data
 * @param canvasTileFolder root folder where to save texture
 *
 */
export async function createTexture(
  canvasId,
  canvas,
  canvasTileFolder,
) {
  const palette = new Palette(canvas.colors);
  const canvasSize = canvas.size;
  // dont create textures larger than 4096
  const targetSize = Math.min(canvasSize, 4096);
  const amount = targetSize / TILE_SIZE;
  const zoom = Math.log2(amount) * 2 / TILE_ZOOM_LEVEL;
  const textureBuffer = new Uint8Array(targetSize * targetSize * 3);
  const startTime = Date.now();

  const na = [];

  const prom = (targetSize !== canvasSize)
    ? async (dx, dy) => {
      const chunkfile = `${canvasTileFolder}/${zoom}/${dx}/${dy}.webp`;
      try {
        if (!fs.existsSync(chunkfile)) {
          na.push([dx, dy]);
          return;
        }
        const chunk = await sharp(chunkfile).removeAlpha().raw().toBuffer();
        addRGBSubtiletoTile(amount, [dx, dy], chunk, textureBuffer);
      } catch (error) {
        na.push([dx, dy]);
        console.error(
          // eslint-disable-next-line max-len
          `Tiling: Error on createTexture in chunk ${chunkfile}: ${error.message}`,
        );
      }
    }
    : async (dx, dy) => {
      try {
        let chunk = null;
        chunk = await RedisCanvas.getChunk(
          canvasId,
          dx,
          dy,
        );
        if (!chunk || !chunk.length) {
          na.push([dx, dy]);
          return;
        }
        addIndexedSubtiletoTile(
          palette,
          amount,
          [dx, dy],
          chunk,
          textureBuffer,
        );
      } catch (error) {
        na.push([dx, dy]);
        console.error(
          // eslint-disable-next-line max-len
          `Tiling: Failed to get Chunk ch:${canvasId}:${dx}${dy} with error ${error.message}`,
        );
      }
    };

  const promises = [];
  for (let dy = 0; dy < amount; dy += 1) {
    for (let dx = 0; dx < amount; dx += 1) {
      promises.push(prom(dx, dy));
    }
  }
  await Promise.all(promises);

  na.forEach((element) => {
    deleteSubtilefromTile(TILE_SIZE, palette, amount, element, textureBuffer);
  });

  const filename = `${canvasTileFolder}/texture.webp`;
  try {
    await sharp(textureBuffer, {
      raw: {
        width: targetSize,
        height: targetSize,
        channels: 3,
      },
    }).toFile(filename);
  } catch (error) {
    console.error(
      `Tiling: Error on createTexture: ${error.message}`,
    );
    return;
  }
  console.log(
    `Tiling: Created texture in ${(Date.now() - startTime) / 1000}s.`,
  );
}

/*
 * Create all tiles
 * @param canvasId id of the canvas
 * @param canvas canvas data
 * @param canvasTileFolder folder for tiles
 * @param force overwrite existing tiles
 */
export async function initializeTiles(
  canvasId,
  canvas,
  canvasTileFolder,
  force = false,
) {
  console.log(
    `Tiling: Initializing tiles in ${canvasTileFolder}, forceint = ${force}`,
  );
  const startTime = Date.now();
  const palette = new Palette(canvas.colors);
  const canvasSize = canvas.size;
  const maxTiledZoom = getMaxTiledZoom(canvasSize);
  // empty tile
  await createEmptyTile(canvasTileFolder, palette);
  // base zoomlevel
  let zoom = maxTiledZoom - 1;
  let zoomDir = `${canvasTileFolder}/${zoom}`;
  console.log(`Tiling: Checking zoomlevel ${zoomDir}`);
  if (!fs.existsSync(zoomDir)) fs.mkdirSync(zoomDir);
  let cnt = 0;
  let cnts = 0;
  const maxBase = TILE_ZOOM_LEVEL ** zoom;
  for (let cx = 0; cx < maxBase; cx += 1) {
    const tileDir = `${canvasTileFolder}/${zoom}/${cx}`;
    if (!fs.existsSync(tileDir)) {
      fs.mkdirSync(tileDir);
    }
    for (let cy = 0; cy < maxBase; cy += 1) {
      const filename = `${canvasTileFolder}/${zoom}/${cx}/${cy}.webp`;
      if (force || !fs.existsSync(filename)) {
        const ret = await createZoomTileFromChunk(
          canvasId,
          canvas,
          canvasTileFolder,
          [cx, cy],
          palette,
        );
        if (ret) cnts += 1;
        cnt += 1;
      }
    }
  }
  console.log(
    `Tiling: Created ${cnts} / ${cnt} tiles for basezoom of canvas${canvasId}`,
  );
  // zoomlevels that are created from other zoomlevels
  for (zoom = maxTiledZoom - 2; zoom >= 0; zoom -= 1) {
    cnt = 0;
    cnts = 0;
    zoomDir = `${canvasTileFolder}/${zoom}`;
    console.log(`Tiling: Checking zoomlevel ${zoomDir}`);
    if (!fs.existsSync(zoomDir)) fs.mkdirSync(zoomDir);
    const maxZ = TILE_ZOOM_LEVEL ** zoom;
    for (let cx = 0; cx < maxZ; cx += 1) {
      const tileDir = `${canvasTileFolder}/${zoom}/${cx}`;
      if (!fs.existsSync(tileDir)) {
        fs.mkdirSync(tileDir);
      }
      for (let cy = 0; cy < maxZ; cy += 1) {
        const filename = `${canvasTileFolder}/${zoom}/${cx}/${cy}.webp`;
        if (force || !fs.existsSync(filename)) {
          const ret = await createZoomedTile(
            canvas,
            canvasTileFolder,
            [zoom, cx, cy],
            palette,
          );
          if (ret) cnts += 1;
          cnt += 1;
        }
      }
    }
    console.log(
      // eslint-disable-next-line max-len
      `Tiling: Created ${cnts} / ${cnt} tiles for zoom ${zoom} for canvas${canvasId}`,
    );
  }
  // create snapshot texture
  await createTexture(
    canvasId,
    canvas,
    canvasTileFolder,
  );
  //--
  console.log(
    // eslint-disable-next-line max-len
    `Tiling: Elapsed Time: ${Math.round((Date.now() - startTime) / 1000)} for canvas${canvasId}`,
  );
}
