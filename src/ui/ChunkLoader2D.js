/*
 * Fetching and storing of 2D chunks
 */

import ChunkLoader from './ChunkLoader';
import Chunk from './Chunk2D';
import { TILE_SIZE, TILE_ZOOM_LEVEL } from '../core/constants';
import { shardOrigin } from '../store/actions/fetch';
import {
  loadingTiles,
  loadImage,
} from './loadImage';
import {
  getMaxTiledZoom,
  getCellInsideChunk,
  getChunkOfPixel,
  getHistoricalCanvasSize,
} from '../core/utils';

class ChunkLoader2D extends ChunkLoader {
  canvasMaxTiledZoom;
  historicalMaxTiledZooms;
  palette;
  canvasSize;

  constructor(store, canvasId, palette, canvasSize, historicalSizes) {
    super(store, canvasId);
    this.palette = palette;
    this.canvasSize = canvasSize;
    this.canvasMaxTiledZoom = getMaxTiledZoom(canvasSize);

    if (historicalSizes) {
      this.historicalMaxTiledZooms = historicalSizes.map((ts) => {
        const [date, size] = ts;
        return [date, getMaxTiledZoom(size)];
      });
    } else {
      this.historicalMaxTiledZooms = [];
    }
  }

  getPixelUpdate(
    cx,
    cy,
    offset,
    color,
  ) {
    const chunk = this.cget(`${this.canvasMaxTiledZoom}:${cx}:${cy}`);
    if (chunk) {
      const ix = offset % TILE_SIZE;
      const iy = Math.floor(offset / TILE_SIZE);
      chunk.setColor([ix, iy], color);
    }
  }

  getColorIndexOfPixel(
    x,
    y,
  ) {
    const { canvasSize } = this;
    const [cx, cy] = getChunkOfPixel(canvasSize, x, y);
    const key = `${this.canvasMaxTiledZoom}:${cx}:${cy}`;
    const chunk = this.cget(key);
    if (!chunk) {
      return 0;
    }
    return chunk.getColorIndex(
      getCellInsideChunk(canvasSize, [x, y]),
    );
  }

  /*
   * Get color of pixel in current historical view
   * (has to account for canvas size changes in the past
   * @param x, y world coordinates of pixel
   * @return ColorIndex or null if chunks not loaded or historical view not set
   */
  getHistoricalIndexOfPixel(
    x,
    y,
    historicalDate,
    historicalTime,
    historicalCanvasSize,
  ) {
    if (!historicalDate) {
      return null;
    }
    const [cx, cy] = getChunkOfPixel(historicalCanvasSize, x, y);
    const px = getCellInsideChunk(historicalCanvasSize, [x, y]);
    const curTime = Date.now();

    if (historicalTime && historicalTime !== '0000') {
      // eslint-disable-next-line max-len
      const incrementalChunkKey = `${historicalDate}${historicalTime}:${cx}:${cy}`;
      const incrementalChunk = this.cget(incrementalChunkKey);
      if (incrementalChunk) {
        const incrementalColor = incrementalChunk.getColorIndex(px, false);
        incrementalChunk.timestamp = curTime;
        if (incrementalColor !== null) {
          return incrementalColor;
        }
      }
    }

    const chunkKey = `${historicalDate}:${cx}:${cy}`;
    const chunk = this.cget(chunkKey);
    if (!chunk) {
      return null;
    }
    chunk.timestamp = curTime;
    return chunk.getColorIndex(px);
  }

  /*
   * preLoad chunks by generating them out of
   * available lower zoomlevel chunks
   */
  preLoadChunk(
    zoom,
    cx,
    cy,
    chunkRGB,
  ) {
    if (zoom <= 0) return null;

    try {
      // first try if one zoomlevel higher is available (without fetching it)
      let plZoom = zoom - 1;
      let zoomDiffAbs = TILE_ZOOM_LEVEL;
      let [plX, plY] = [cx, cy].map((z) => (Math.floor(z / zoomDiffAbs)));
      let plChunk = this.getChunk(plZoom, plX, plY, false, false, true);
      if (!plChunk) {
        // if not, try one more zoomlevel higher, fetching it if not available
        if (plZoom > 0) {
          plZoom -= 1;
        }
        zoomDiffAbs = TILE_ZOOM_LEVEL ** (zoom - plZoom);
        [plX, plY] = [cx, cy].map((z) => (Math.floor(z / zoomDiffAbs)));
        plChunk = this.getChunk(plZoom, plX, plY, true, false, true);
      }
      if (plChunk) {
        const pcX = (cx % zoomDiffAbs) * TILE_SIZE / zoomDiffAbs;
        const pcY = (cy % zoomDiffAbs) * TILE_SIZE / zoomDiffAbs;
        chunkRGB.preLoad(plChunk, zoomDiffAbs, pcX, pcY);
        return chunkRGB.image;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Error occurred while preloading for ${zoom}:${cx}:${cy}`,
        error);
      return null;
    }
    return null;
  }


  getChunk(
    zoom,
    cx,
    cy,
    fetch = true,
    showLoadingTile = true,
    chunkPreLoading = true,
  ) {
    const chunkKey = `${zoom}:${cx}:${cy}`;
    let chunkRGB = this.cget(chunkKey);
    if (chunkRGB) {
      if (chunkRGB.ready) {
        return chunkRGB.image;
      }
    } else if (fetch) {
      chunkRGB = new Chunk(this.palette, zoom, cx, cy);
      this.cset(chunkKey, chunkRGB);
      // fetch chunk
      if (this.canvasMaxTiledZoom === zoom) {
        this.fetchBaseChunk(cx, cy, chunkRGB);
      } else {
        this.fetchTile(zoom, cx, cy, chunkRGB);
      }
    }
    if (chunkPreLoading && chunkRGB) {
      const preLoad = this.preLoadChunk(zoom, cx, cy, chunkRGB);
      if (preLoad) return preLoad;
    }
    return (showLoadingTile) ? loadingTiles.getTile(this.canvasId) : null;
  }

  getHistoricalChunk(cx, cy, fetch, historicalDate, historicalTime = null) {
    let chunkKey = (historicalTime)
      ? `${historicalDate}${historicalTime}`
      : historicalDate;
    chunkKey += `:${cx}:${cy}`;
    const chunk = this.cget(chunkKey);
    const { canvasId } = this;
    if (chunk) {
      if (chunk.ready) {
        return chunk.image;
      }
      return (historicalTime) ? null : loadingTiles.getTile(canvasId);
    } if (fetch) {
      const historicalCanvasMaxTiledZoom = getHistoricalCanvasSize(
        historicalDate,
        this.canvasMaxTiledZoom,
        this.historicalMaxTiledZooms,
      );
      // fetch tile
      const chunkRGB = new Chunk(
        this.palette,
        historicalCanvasMaxTiledZoom,
        cx,
        cy,
      );
      this.cset(chunkKey, chunkRGB);
      this.fetchHistoricalChunk(
        cx,
        cy,
        historicalDate,
        historicalTime,
        chunkRGB,
      );
    }
    return (historicalTime) ? null : loadingTiles.getTile(canvasId);
  }

  async fetchHistoricalChunk(
    cx,
    cy,
    historicalDate,
    historicalTime,
    chunkRGB,
  ) {
    const { canvasId } = this;

    // eslint-disable-next-line max-len
    let url = `${window.ssv.backupurl}/${historicalDate.slice(0, 4)}/${historicalDate.slice(4, 6)}/${historicalDate.slice(6)}/`;
    if (historicalTime) {
      // incremental tiles
      url += `${canvasId}/${historicalTime}/${cx}/${cy}.png`;
    } else {
      // full tiles
      url += `${canvasId}/tiles/${cx}/${cy}.png`;
    }
    this.bcReqChunk(chunkRGB);
    try {
      const img = await loadImage(url);
      chunkRGB.fromImage(img);
      this.bcRecChunk(chunkRGB);
    } catch (error) {
      this.bcReqChunkFail(chunkRGB, error);
      if (historicalTime) {
        chunkRGB.empty(true);
      } else {
        chunkRGB.empty();
      }
    }
  }

  async fetchBaseChunk(cx, cy, chunkRGB) {
    this.bcReqChunk(chunkRGB);
    try {
      const url = `${shardOrigin}/chunks/${this.canvasId}/${cx}/${cy}.bmp`;
      const response = await fetch(url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength) {
          const chunkArray = new Uint8Array(arrayBuffer);
          chunkRGB.fromBuffer(chunkArray);
        } else {
          throw new Error('Chunk response was invalid');
        }
        this.bcRecChunk(chunkRGB);
      } else {
        throw new Error('Network response was not ok.');
      }
    } catch (error) {
      chunkRGB.empty();
      chunkRGB.recUpdates = true;
      this.bcReqChunkFail(chunkRGB, error);
    }
  }

  async fetchTile(zoom, cx, cy, chunkRGB) {
    this.bcReqChunk(chunkRGB);
    try {
    // eslint-disable-next-line max-len
      const url = `/tiles/${this.canvasId}/${zoom}/${cx}/${cy}.webp`;
      const img = await loadImage(url);
      chunkRGB.fromImage(img);
      this.bcRecChunk(chunkRGB);
    } catch (error) {
      chunkRGB.empty();
      this.bcReqChunkFail(chunkRGB, error);
    }
  }
}

export default ChunkLoader2D;
