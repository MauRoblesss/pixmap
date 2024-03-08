/*
 * worker thread for ..core/tileserver.js
 */

/* eslint-disable no-console */

import { isMainThread, parentPort } from 'worker_threads';

import { connect as connectRedis } from '../data/redis/client';
import {
  createZoomTileFromChunk,
  createZoomedTile,
  createTexture,
  initializeTiles,
} from '../core/Tile';

if (isMainThread) {
  throw new Error(
    'Tilewriter is run as a worker thread, not as own process',
  );
}

connectRedis()
  .then(() => {
    parentPort.on('message', async (msg) => {
      const { task, args } = msg;
      try {
        switch (task) {
          case 'createZoomTileFromChunk':
            await createZoomTileFromChunk(...args);
            break;
          case 'createZoomedTile':
            await createZoomedTile(...args);
            break;
          case 'createTexture':
            await createTexture(...args);
            break;
          case 'initializeTiles':
            await initializeTiles(...args);
            break;
          default:
            console.warn(`Tiling: Main thread requested unknown task ${task}`);
        }
        parentPort.postMessage('Done!');
      } catch (error) {
        console.warn(
          // eslint-disable-next-line max-len
          `Tiling: Error on executing task ${task} args ${args}: ${error.message}`,
        );
        parentPort.postMessage('Failure!');
      }
    });
  });
