/*
 * runs a filter over a larger canvas area over time
 *
 */

import {
  setData,
  getData,
  setStatus,
  getStatus,
} from '../data/redis/CanvasCleaner';
import RedisCanvas from '../data/redis/RedisCanvas';
import {
  getChunkOfPixel,
  getCornerOfChunk,
} from './utils';
import { setPixelByOffset } from './setPixel';
import {
  TILE_SIZE,
} from './constants';
import logger from './logger';
import canvases from './canvases';

const METHODS = {
  /*
   * @param xc, yc chunk coordinates of pixel relative to center chunk
   *   of chunk area
   */
  spare: (xc, yc, clrIgnore, canvasCleaner) => {
    let pxl = canvasCleaner.getPixelInChunkArea(xc, yc);
    if (pxl === null || pxl < clrIgnore) {
      return null;
    }
    let rplPxl = null;
    for (let u = -1; u <= 1; u += 1) {
      for (let v = -1; v <= 1; v += 1) {
        pxl = canvasCleaner.getPixelInChunkArea(xc + u, yc + v);
        if (pxl === null
          || (u === 0 && v === 0)
        ) {
          continue;
        }
        if (pxl >= clrIgnore) {
          return null;
        }
        if (rplPxl === null) {
          rplPxl = pxl;
        }
      }
    }
    return rplPxl;
  },

  spareext: (xc, yc, clrIgnore, canvasCleaner) => {
    let pxl = canvasCleaner.getPixelInChunkArea(xc, yc);
    if (pxl === null || pxl < clrIgnore) {
      return null;
    }
    let cntSet = 1;
    let rplPxl = null;
    for (let u = -1; u <= 1; u += 1) {
      for (let v = -1; v <= 1; v += 1) {
        pxl = canvasCleaner.getPixelInChunkArea(xc + u, yc + v);
        if (pxl === null
          || (u === 0 && v === 0)
        ) {
          continue;
        }
        if (pxl >= clrIgnore) {
          if (cntSet >= 2) {
            return null;
          }
          cntSet += 1;
        }
        if (rplPxl === null) {
          rplPxl = pxl;
        }
      }
    }
    return rplPxl;
  },

  spareextu: (xc, yc, clrIgnore, canvasCleaner) => {
    let pxl = canvasCleaner.getPixelInChunkArea(xc, yc);
    if (pxl === null || pxl < clrIgnore) {
      return null;
    }
    let rplPxl = null;
    let fixPxl = null;
    const origPxl = pxl;
    for (let u = -1; u <= 1; u += 1) {
      for (let v = -1; v <= 1; v += 1) {
        pxl = canvasCleaner.getPixelInChunkArea(xc + u, yc + v);
        if (pxl === null
          || (u === 0 && v === 0)
        ) {
          continue;
        }
        if (pxl < clrIgnore) {
          if (rplPxl === null) {
            rplPxl = pxl;
          }
          continue;
        }
        if (fixPxl === null) {
          fixPxl = pxl;
          continue;
        }
        if (pxl !== fixPxl) {
          return null;
        }
      }
    }
    const finPxl = (rplPxl !== null) ? rplPxl : fixPxl;
    if (finPxl === origPxl) {
      return null;
    }
    return finPxl;
  },
};

class CanvasCleaner {
  // canvas id: integer
  canvasId;
  // coords of top left and bottom right corner of area: integer
  x;
  y;
  u;
  v;
  // name of filter method, string
  methodName;
  // 3x3 canvas area
  // [
  //   [AA, AB, AC],
  //   [BA, BB, BC],
  //   [CA, CB, CC],
  // ]
  chunks;
  // chunk coordinates of center BB of chunks
  centerChunk;
  // iterator over chunks
  cIter;
  // info about chunks of total affected area
  // cx, cy: top right chunk coords
  // cw, ch: height and width in chunks
  // amountChunks: cw * ch
  cx; cy;
  cw; ch;
  amountChunks;
  // current setTimeout index
  tick;
  // if running: boolean
  running;
  // stats
  pxlProcessed;
  pxlCleaned;

  constructor() {
    this.logger = (text) => {
      logger.warn(`[CanvasCleaner] ${text}`);
    };
    this.cleanChunk = this.cleanChunk.bind(this);
    this.clearValues();
  }

  clearValues() {
    this.running = false;
    this.chunks = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    this.centerChunk = [null, null];
    this.cIter = 0;
    this.cx = 0;
    this.cy = 0;
    this.cw = 0;
    this.ch = 0;
    this.amountChunks = 0;
    this.pxlProcessed = 0;
    this.pxlCleaned = 0;
    this.tick = null;
  }

  async initialize() {
    const [cIter, running] = await getStatus();
    if (running) {
      const [canvasId, x, y, u, v, methodName] = await getData();
      this.set(canvasId, x, y, u, v, methodName, cIter);
    }
  }

  stop() {
    this.running = false;
    const str = 'Stopped CanvasCleaner';
    this.logger(str);
    return str;
  }

  async cleanChunk() {
    this.tick = null;
    const {
      canvasId, cIter, cw, cx, cy,
    } = this;
    const method = METHODS[this.methodName];
    if (cIter >= this.amountChunks || !this.running) {
      // finished
      //  eslint-disable-next-line max-len
      this.logger(`Finished Cleaning on ${this.x},${this.y}, cleaned ${this.pxlCleaned} / ${this.pxlProcessed} pixels`);
      this.clearValues();
      this.saveStatus();
      return;
    }
    const canvas = canvases[canvasId];
    let i = (cIter % cw);
    const j = ((cIter - i) / cw) + cy;
    i += cx;
    const clrIgnore = canvas.cli || 0;

    await this.loadChunkArea(i, j);
    if (this.checkIfChunkInArea(i, j)) {
      const [xCor, yCor] = getCornerOfChunk(canvas.size, i, j);
      const xLow = (xCor > this.x) ? 0 : (this.x - xCor);
      const yLow = (yCor > this.y) ? 0 : (this.y - yCor);
      const xHigh = (xCor + TILE_SIZE <= this.u) ? TILE_SIZE
        : (this.u - xCor + 1);
      const yHigh = (yCor + TILE_SIZE <= this.v) ? TILE_SIZE
        : (this.v - yCor + 1);
      for (let xc = xLow; xc < xHigh; xc += 1) {
        for (let yc = yLow; yc < yHigh; yc += 1) {
          // eslint-disable-next-line no-await-in-loop
          const rplPxl = await method(xc, yc, clrIgnore, this);
          this.pxlProcessed += 1;
          if (rplPxl !== null) {
            this.pxlCleaned += 1;
            setPixelByOffset(
              canvasId,
              rplPxl,
              i, j,
              yc * TILE_SIZE + xc,
            );
          }
        }
      }
    }

    this.saveStatus();
    this.cIter += 1;

    this.tick = setTimeout(this.cleanChunk, 500);
  }

  set(canvasId, x, y, u, v, methodName, cIter = 0) {
    if (!METHODS[methodName]) {
      const str = `Method ${methodName} not available`;
      this.logger(str);
      return str;
    }
    const canvas = canvases[canvasId];
    if (!canvas) {
      const str = `Canvas ${canvasId} invalid`;
      this.logger(str);
      return str;
    }
    if (canvas.v) {
      const str = 'Can not clean 3D canvas';
      this.logger(str);
      return str;
    }
    if (x > u || y > v) {
      const str = 'Invalid area';
      this.logger(str);
      return str;
    }
    const canvasSize = canvas.size;
    const canvasMaxXY = canvasSize / 2;
    const canvasMinXY = -canvasMaxXY;
    if (x < canvasMinXY || y < canvasMinXY
      || x >= canvasMaxXY || y >= canvasMaxXY
      || u < canvasMinXY || v < canvasMinXY
      || u >= canvasMaxXY || v >= canvasMaxXY) {
      const str = 'Coordinates out of bounds';
      this.logger(str);
      return str;
    }

    if (this.tick) {
      this.running = false;
      clearTimeout(this.tick);
    }
    this.canvasId = canvasId;
    this.x = x;
    this.y = y;
    this.u = u;
    this.v = v;
    this.cIter = cIter;
    this.methodName = methodName;
    const [cx, cy] = getChunkOfPixel(canvas.size, this.x, this.y);
    this.cx = cx;
    this.cy = cy;
    const [cu, cv] = getChunkOfPixel(canvas.size, this.u, this.v);
    this.cw = cu - cx + 1;
    this.ch = cv - cy + 1;
    this.amountChunks = this.cw * this.ch;

    this.running = true;
    this.tick = setTimeout(this.cleanChunk, 500);
    // eslint-disable-next-line max-len
    this.logger(`Start Cleaning on #${canvas.ident},${this.x},${this.y} till #${canvas.ident},${this.u},${this.v} with method ${methodName}`);
    this.saveData();
    return null;
  }

  /*
   * get pixel out of 3x3 chunk area
   * @param x, y coordinates relative to center chunk
   * @return integer color index or null if chunk is empty
   */
  getPixelInChunkArea(x, y) {
    const { chunks } = this;
    let col;
    let xc = x;
    if (x >= 0 && x < TILE_SIZE) {
      col = 1;
    } else if (x < 0) {
      col = 0;
      xc += TILE_SIZE;
    } else {
      col = 2;
      xc -= TILE_SIZE;
    }
    let row;
    let yc = y;
    if (y >= 0 && y < TILE_SIZE) {
      row = 1;
    } else if (y < 0) {
      row = 0;
      yc += TILE_SIZE;
    } else {
      row = 2;
      yc -= TILE_SIZE;
    }
    const chunk = chunks[row][col];
    if (!chunk) return null;
    // get rid of protection
    return chunk[yc * TILE_SIZE + xc] & 0x3F;
  }

  /*
   * load 3x3 chunk area
   * @param i, j chunk coordinates of center chunk
   */
  async loadChunkArea(i, j) {
    const { chunks, centerChunk, canvasId } = this;
    const [io, jo] = centerChunk;
    const newChunks = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    for (let iRel = -1; iRel <= 1; iRel += 1) {
      for (let jRel = -1; jRel <= 1; jRel += 1) {
        let chunk = null;
        const iAbs = iRel + i;
        const jAbs = jRel + j;
        if (
          io && jo
          && iAbs >= io - 1
          && iAbs <= io + 1
          && jAbs >= jo - 1
          && jAbs <= jo + 1
        ) {
          chunk = chunks[jAbs - jo + 1][iAbs - io + 1];
        } else {
          try {
            // eslint-disable-next-line no-await-in-loop
            chunk = await RedisCanvas.getChunk(
              canvasId,
              iAbs,
              jAbs,
              TILE_SIZE ** 2,
            );
          } catch (error) {
            this.logger(
              // eslint-disable-next-line max-len
              `Couldn't load chunk ch:${canvasId}:${iAbs}:${jAbs}: ${error.message}}`,
            );
          }
        }
        newChunks[jRel + 1][iRel + 1] = chunk;
      }
    }
    this.chunks = newChunks;
    this.centerChunk = [i, j];
  }

  /*
   * check if chunk exists in area and is not empty
   * @param i, j chunk to check
   */
  checkIfChunkInArea(i, j) {
    const { chunks, centerChunk } = this;
    const [io, jo] = centerChunk;
    if (
      io && jo
      && i >= io - 1
      && i <= io + 1
      && j >= jo - 1
      && j <= jo + 1
    ) {
      const col = i - io + 1;
      const row = j - jo + 1;
      if (chunks[row][col] !== null) {
        return true;
      }
    }
    return false;
  }

  reportStatus() {
    return {
      running: this.running,
      canvasId: this.canvasId,
      percent: `${this.cIter} / ${this.amountChunks}`,
      tl: `${this.x}_${this.y}`,
      br: `${this.u}_${this.v}`,
      method: this.methodName,
    };
  }

  saveData() {
    setData(this.canvasId, this.x, this.y, this.u, this.v, this.methodName);
  }

  saveStatus() {
    setStatus(this.cIter, this.running);
  }
}

export default new CanvasCleaner();
