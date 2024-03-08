/*
 * this is the actual event
 * A ever growing circle of random pixels starts at event area
 * users fight it with background pixels
 * if it reaches the TARGET_RADIUS size, the event is lost
 *
 */
import socketEvents from '../socket/socketEvents';
import {
  hydratePixelUpdate,
} from '../socket/packets/server';
import { setPixelByOffset } from './setPixel';
import { TILE_SIZE } from './constants';
import { CANVAS_ID } from '../data/redis/Event';
import canvases from './canvases';

const TARGET_RADIUS = 62;

class Void {
  // chunk coords
  i;
  j;
  // number highest possible colorIndex
  maxClr;
  // timeout between pixels in ms
  msTimeout;
  // array of pixels that we place before continue building (instant-defense)
  pixelStack;
  // Uint8Array to log pixels in area
  area;
  userArea;
  // current numerical data
  curRadius;
  curAngle;
  curAngleDelta;
  // boolean if ended
  ended;

  constructor(centerCell, targetDuration) {
    // chunk coordinates
    const [i, j] = centerCell;
    this.i = i;
    this.j = j;
    this.ended = false;
    this.maxClr = canvases[CANVAS_ID].colors.length;
    const area = TARGET_RADIUS ** 2 * Math.PI;
    const online = socketEvents.onlineCounter.total || 0;
    // adjusted from 1.8 to 2.0 on 2022.04.26
    // adjusted back to 1.8 on 2022.08.12
    const requiredSpeed = Math.floor(online / 1.8);
    const ppm = Math.ceil(area / targetDuration + requiredSpeed);
    this.msTimeout = 60 * 1000 / ppm;
    this.area = new Uint8Array(TILE_SIZE * 3 * TILE_SIZE * 3);
    this.userArea = new Uint8Array(TILE_SIZE * 3 * TILE_SIZE * 3);
    this.pixelStack = [];
    this.curRadius = 0;
    this.curAngle = 0;
    this.curAngleDelta = Math.PI;

    this.voidLoop = this.voidLoop.bind(this);
    this.cancel = this.cancel.bind(this);
    this.checkStatus = this.checkStatus.bind(this);
    this.broadcastPixelBuffer = this.broadcastPixelBuffer.bind(this);
    socketEvents.addListener('pixelUpdate', this.broadcastPixelBuffer);
    this.voidLoop();
  }

  /*
   * send pixel relative to 3x3 tile area
   */
  sendPixel(x, y, clr) {
    const [u, v, off] = Void.coordsToOffset(x, y);
    const i = this.i + u;
    const j = this.j + v;
    this.area[x + y * TILE_SIZE * 3] = clr;
    setPixelByOffset(CANVAS_ID, clr, i, j, off);
  }

  /*
   * check if pixel is set by us
   * x, y relative to 3x3 tiles area
   */
  isSet(x, y, resetIfSet = false) {
    const off = x + y * TILE_SIZE * 3;
    const clr = this.area[off];
    if (clr) {
      if (resetIfSet) this.area[off] = 0;
      return true;
    }
    return false;
  }

  /*
   * check if pixel is set by user during event
   */
  isUserSet(x, y) {
    const off = x + y * TILE_SIZE * 3;
    const clr = this.userArea[off];
    return clr || false;
  }

  static coordsToOffset(x, y) {
    const ox = x % TILE_SIZE;
    const oy = y % TILE_SIZE;
    const off = ox + oy * TILE_SIZE;
    const u = (x - ox) / TILE_SIZE - 1;
    const v = (y - oy) / TILE_SIZE - 1;
    return [u, v, off];
  }

  voidLoop() {
    if (this.ended) {
      return;
    }
    let clr = 0;
    while (clr <= 2 || clr === 25) {
      // choose random color
      clr = Math.floor(Math.random() * this.maxClr);
    }
    const pxl = this.pixelStack.pop();
    if (pxl) {
      // use stack pixel if available
      const [x, y] = pxl;
      this.sendPixel(x, y, clr);
    } else {
      // build in a circle
      /* that really is the best here */
      // eslint-disable-next-line no-constant-condition
      while (true) {
        this.curAngle += this.curAngleDelta;
        if (this.curAngle > 2 * Math.PI) {
          // it does skip some pixel, but that's ok
          this.curRadius += 1;
          if (this.curRadius > TARGET_RADIUS) {
            this.cancel();
            return;
          }
          this.curAngleDelta = 2 * Math.PI / (2 * this.curRadius * Math.PI);
          this.curAngle = 0;
        }
        const { curAngle, curRadius } = this;
        let gk = Math.sin(curAngle) * curRadius;
        let ak = Math.cos(curAngle) * curRadius;
        if (gk > 0) gk = Math.floor(gk);
        else gk = Math.ceil(gk);
        if (ak > 0) ak = Math.floor(ak);
        else ak = Math.ceil(ak);
        const x = ak + TILE_SIZE * 1.5;
        const y = gk + TILE_SIZE * 1.5;
        if (this.isSet(x, y)) {
          continue;
        }
        this.sendPixel(x, y, clr);
        if (this.isUserSet(x, y)) {
          // if drawing on a user set pixel, wait longer
          setTimeout(this.voidLoop, this.msTimeout * 4);
          return;
        }
        break;
      }
    }
    setTimeout(this.voidLoop, this.msTimeout);
  }

  cancel() {
    this.ended = true;
    socketEvents.removeListener('pixelUpdate', this.broadcastPixelBuffer);
  }

  checkStatus() {
    if (this.ended) {
      return 100;
    }
    return Math.floor(this.curRadius * 100 / TARGET_RADIUS);
  }

  broadcastPixelBuffer(canvasId, chunkId, buffer) {
    const {
      i: pi,
      j: pj,
      pixels,
    } = hydratePixelUpdate(buffer);
    const { i, j } = this;
    // 3x3 chunk area (this is hardcoded on multiple places)
    if (pi >= i - 1 && pi <= i + 1 && pj >= j - 1 && pj <= j + 1) {
      pixels.forEach((pxl) => {
        const [off, color] = pxl;
        if (color === 2 || color === 25) {
          const uOff = (pi - i + 1) * TILE_SIZE;
          const vOff = (pj - j + 1) * TILE_SIZE;
          const x = uOff + off % TILE_SIZE;
          const y = vOff + Math.floor(off / TILE_SIZE);
          if (this.isSet(x, y, true)) {
            this.pixelStack.push([x, y]);
          } else {
            this.userArea[x + y * TILE_SIZE * 3] = color;
          }
        }
      });
    }
  }
}

export default Void;
