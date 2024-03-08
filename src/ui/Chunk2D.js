import { TILE_SIZE } from '../core/constants';
import Chunk from './Chunk';


class Chunk2D extends Chunk {
  // HTMLCanvasElement of chunk
  image;
  // boolean if chunk loaded (request done)
  ready;
  // boolean if chunk is empty
  isEmpty;
  // palette of canvas
  palette;

  constructor(palette, zoom = 0, cx = 0, cy = 0) {
    super(zoom, cx, cy);
    this.palette = palette;
    this.image = document.createElement('canvas');
    this.image.width = TILE_SIZE;
    this.image.height = TILE_SIZE;
    this.ready = false;
    this.isEmpty = false;
  }

  // from Uint8Array
  fromBuffer(chunkBuffer) {
    this.recUpdates = true;
    const imageData = new ImageData(TILE_SIZE, TILE_SIZE);
    const imageView = new Uint32Array(imageData.data.buffer);
    const { abgr } = this.palette;
    let bufferLength = chunkBuffer.byteLength;
    for (let i = 0; i < bufferLength; i += 1) {
      imageView[i] = abgr[chunkBuffer[i] & 0x3F];
    }
    const neededLength = TILE_SIZE ** 2;
    const background = this.palette.abgr[0];
    while (bufferLength < neededLength) {
      imageView[bufferLength] = background;
      bufferLength += 1;
    }
    const ctx = this.image.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    this.ready = true;
  }

  preLoad(img, zoomDiffAbs, sx, sy) {
    if (this.ready) {
      return;
    }
    this.ready = true;
    const ctx = this.image.getContext('2d');
    ctx.save();
    ctx.msImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(zoomDiffAbs, zoomDiffAbs);
    const sDim = TILE_SIZE / zoomDiffAbs;
    ctx.drawImage(img, sx, sy, sDim, sDim, 0, 0, sDim, sDim);
    ctx.restore();
  }

  fromImage(img) {
    this.ready = true;
    const ctx = this.image.getContext('2d');
    ctx.drawImage(img, 0, 0);
  }

  empty(transparent = false) {
    this.ready = true;
    this.isEmpty = true;
    if (!transparent) {
      const { image, palette } = this;
      const ctx = image.getContext('2d');
      // eslint-disable-next-line prefer-destructuring
      ctx.fillStyle = palette.colors[0];
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    }
  }

  static getIndexFromCell([x, y]) {
    return x + (TILE_SIZE * y);
  }

  getColorIndex(cell, nearest = true) {
    const [x, y] = cell;
    const ctx = this.image.getContext('2d');

    const rgb = ctx.getImageData(x, y, 1, 1).data;
    const ind = (nearest)
      ? this.palette.getClosestIndexOfColor(rgb[0], rgb[1], rgb[2])
      : this.palette.getIndexOfColor(rgb[0], rgb[1], rgb[2]);
    return ind;
  }

  hasColorIn(cell, color) {
    const index = Chunk2D.getIndexFromCell(cell);

    const ctx = this.image.getContext('2d');
    const imageData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    const intView = new Uint32Array(imageData.data.buffer);

    return (intView[index] === this.palette.abgr[color]);
  }

  setColor(cell, color) {
    const [x, y] = cell;
    const ctx = this.image.getContext('2d');
    ctx.fillStyle = this.palette.colors[color];
    ctx.fillRect(x, y, 1, 1);
    return true;
  }
}

export default Chunk2D;
