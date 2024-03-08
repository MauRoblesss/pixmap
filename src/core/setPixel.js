/*
 * Set pixels on canvas.
 * Pixels get collected in a cache for 5ms and sent to players at once.
 * */
import RedisCanvas from '../data/redis/RedisCanvas';
import {
  getChunkOfPixel,
  getOffsetOfPixel,
} from './utils';
import pixelCache from './PixelCache';
import canvases from './canvases';


/**
 *
 * By Offset is preferred on server side
 * @param canvasId
 * @param color Pixel color
 * @param i Chunk coordinates
 * @param j
 * @param offset Offset of pixel withing chunk
 */
export function setPixelByOffset(
  canvasId,
  color,
  i,
  j,
  offset,
) {
  RedisCanvas.enqueuePixel(canvasId, color, i, j, offset);
  pixelCache.append(canvasId, color, i, j, offset);
}

/**
 *
 * @param canvasId
 * @param canvasId
 * @param color
 * @param x
 * @param y
 * @param z optional, if given its 3d canvas
 */
export function setPixelByCoords(
  canvasId,
  color,
  x,
  y,
  z = null,
) {
  const canvasSize = canvases[canvasId].size;
  const [i, j] = getChunkOfPixel(canvasSize, x, y, z);
  const offset = getOffsetOfPixel(canvasSize, x, y, z);
  setPixelByOffset(canvasId, color, i, j, offset);
}
