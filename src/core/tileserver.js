/*
 * creation of zoom tiles
 *
 */

import fs from 'fs';
import { Worker } from 'worker_threads';

import logger from './logger';
import canvases from './canvases';
import socketEvents from '../socket/socketEvents';

import { TILE_FOLDER } from './config';
import {
  TILE_SIZE,
  TILE_ZOOM_LEVEL,
} from './constants';
import { mod, getMaxTiledZoom } from './utils';


const CanvasUpdaters = {};

/*
 * worker thread
 */
const worker = new Worker('./workers/tilewriter.js');

/*
 * queue of tasks that is worked on in FIFO
 */
const taskQueue = [];

function enqueueTask(task) {
  if (!taskQueue.length) {
    worker.postMessage(task);
  }
  taskQueue.push(task);
}

worker.on('message', () => {
  taskQueue.shift();
  if (taskQueue.length) {
    worker.postMessage(taskQueue[0]);
  }
});

/*
 * every canvas gets an instance of this class
 */
class CanvasUpdater {
  TileLoadingQueues;
  id;
  canvas;
  firstZoomtileWidth;
  canvasTileFolder;

  constructor(id) {
    this.updateZoomlevelTiles = this.updateZoomlevelTiles.bind(this);

    this.TileLoadingQueues = [];
    this.id = id;
    this.canvas = canvases[id];
    this.canvasTileFolder = `${TILE_FOLDER}/${id}`;
    this.firstZoomtileWidth = this.canvas.size / TILE_SIZE / TILE_ZOOM_LEVEL;
    this.maxTiledZoom = getMaxTiledZoom(this.canvas.size);
  }

  /*
   * @param zoom tilezoomlevel to update
   */
  async updateZoomlevelTiles(zoom) {
    const queue = this.TileLoadingQueues[zoom];
    if (typeof queue === 'undefined') return;

    const tile = queue.shift();
    if (typeof tile !== 'undefined') {
      const width = TILE_ZOOM_LEVEL ** zoom;
      const cx = mod(tile, width);
      const cy = Math.floor(tile / width);

      if (zoom === this.maxTiledZoom - 1) {
        enqueueTask({
          task: 'createZoomTileFromChunk',
          args: [
            this.id,
            this.canvas,
            this.canvasTileFolder,
            [cx, cy],
          ],
        });
      } else if (zoom !== this.maxTiledZoom) {
        enqueueTask({
          task: 'createZoomedTile',
          args: [
            this.canvas,
            this.canvasTileFolder,
            [zoom, cx, cy],
          ],
        });
      }

      if (zoom === 0) {
        enqueueTask({
          task: 'createTexture',
          args: [
            this.id,
            this.canvas,
            this.canvasTileFolder,
          ],
        });
      } else {
        const [ucx, ucy] = [cx, cy].map((z) => Math.floor(z / TILE_ZOOM_LEVEL));
        const upperTile = ucx + ucy * (TILE_ZOOM_LEVEL ** (zoom - 1));
        const upperQueue = this.TileLoadingQueues[zoom - 1];
        if (~upperQueue.indexOf(upperTile)) return;
        upperQueue.push(upperTile);
        logger.info(`Tiling: Enqueued ${zoom - 1}, ${ucx}, ${ucy} for reload`);
      }
    }
  }

  /*
   * register changed chunk, queue corresponding tile to reload
   * @param chunk Chunk coordinates
   */
  registerChunkChange(chunk) {
    const queue = this.TileLoadingQueues[Math.max(this.maxTiledZoom - 1, 0)];
    if (typeof queue === 'undefined') return;

    const [cx, cy] = chunk.map((z) => Math.floor(z / TILE_ZOOM_LEVEL));
    const chunkOffset = cx + cy * this.firstZoomtileWidth;
    if (~queue.indexOf(chunkOffset)) return;
    queue.push(chunkOffset);
    /*
    logger.info(
      `Tiling: Enqueued ${cx}, ${cy} / ${this.id} for basezoom reload`,
    );
    */
  }

  /*
   * initialize queues and start loops for updating tiles
   */
  initialize() {
    logger.info(`Tiling: Using folder ${this.canvasTileFolder}`);
    if (!fs.existsSync(`${this.canvasTileFolder}/0`)) {
      if (!fs.existsSync(this.canvasTileFolder)) {
        fs.mkdirSync(this.canvasTileFolder);
      }
      logger.warn(
        'Tiling: tiledir empty, will initialize it, this can take some time',
      );
      enqueueTask({
        task: 'initializeTiles',
        args: [
          this.id,
          this.canvas,
          this.canvasTileFolder,
          false,
        ],
      });
    }
    for (let c = 0; c < this.maxTiledZoom; c += 1) {
      this.TileLoadingQueues.push([]);
      const invZoom = this.maxTiledZoom - c;
      // eslint-disable-next-line max-len
      const timeout = TILE_ZOOM_LEVEL ** (2 * invZoom) * (6 / TILE_ZOOM_LEVEL ** 2) * 1000;
      logger.info(
        `Tiling: Set interval for zoomlevel ${c} update to ${timeout / 1000}`,
      );
      setTimeout(() => {
        setInterval(this.updateZoomlevelTiles, timeout, c);
      }, Math.floor(Math.random() * timeout));
    }
    if (this.maxTiledZoom === 0) {
      // in the case of canvasSize == 256
      this.TileLoadingQueues.push([]);
      const timeout = 5 * 60 * 1000;
      setTimeout(() => {
        setInterval(this.updateZoomlevelTiles, timeout, 0);
      }, Math.floor(Math.random() * timeout));
    }
  }
}

socketEvents.on('chunkUpdate', (canvasId, chunk) => {
  if (CanvasUpdaters[canvasId]) {
    CanvasUpdaters[canvasId].registerChunkChange(chunk);
  }
});

/*
 * starting update loops for canvases
 */
export default function startAllCanvasLoops() {
  if (!fs.existsSync(`${TILE_FOLDER}`)) fs.mkdirSync(`${TILE_FOLDER}`);
  const ids = Object.keys(canvases);
  for (let i = 0; i < ids.length; i += 1) {
    const id = parseInt(ids[i], 10);
    const canvas = canvases[id];
    if (!canvas.v) {
      // just 2D canvases
      const updater = new CanvasUpdater(id);
      updater.initialize();
      CanvasUpdaters[id] = updater;
    }
  }
}
