/**
 *
 * Serve zoomlevel tiles
 *
 */

import fs from 'fs';
import express from 'express';

import canvases from '../core/canvases';
import { getMaxTiledZoom } from '../core/utils';
import { TILE_FOLDER } from '../core/config';


const router = express.Router();

/*
 * decide on cache length
 */
router.use('/:c([0-9]+)/:z([0-9]+)/:x([0-9]+)/:y([0-9]+).webp',
  (req, res, next) => {
    res.set({
      'Access-Control-allow-origin': '*',
    });
    const { c: id } = req.params;
    const canvas = canvases[id];
    if (!canvas) {
      next(new Error('Canvas not found.'));
      return;
    }
    req.canvasId = id;

    const maxTiledZoom = getMaxTiledZoom(canvas.size);
    const { z: paramZ } = req.params;
    const z = parseInt(paramZ, 10);
    if (z < 0 || z >= maxTiledZoom) {
      next(new Error('Invalid zoom level'));
      return;
    }
    const invZoom = maxTiledZoom - z - 1;
    const cacheTime = (15 + 180 * invZoom) * 60;
    const pubCacheTime = Math.floor(cacheTime * 0.75);
    res.set({
      'Cache-Control': `public, s-maxage=${pubCacheTime}, max-age=${cacheTime}`,
    });
    next();
  },
);

/*
 * get other tiles from directory
 */
router.use(express.static(TILE_FOLDER));


/*
 * catch File Not Found: Send empty tile
 */
router.use(async (req, res) => {
  const { canvasId } = req;

  const filename = `${TILE_FOLDER}/${canvasId}/emptytile.webp`;
  if (!fs.existsSync(filename)) {
    res.set({
      'Cache-Control': `public, s-maxage=${24 * 3600}, max-age=${24 * 3600}`,
    });
    res.status(404).end();
    return;
  }

  res.set({
    'Cache-Control': `public, s-maxage=${2 * 3600}, max-age=${1 * 3600}`,
    'Content-Type': 'image/webp',
  });
  res.status(200);
  res.sendFile(filename);
},
);

/*
 * error handler
 */
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  res.status(400).end();
});


export default router;
