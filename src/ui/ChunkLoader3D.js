/*
 * Loading 3D chunks
 *
 */

import ChunkLoader from './ChunkLoader';
import Chunk from './Chunk3D';
import {
  getChunkOfPixel,
  getOffsetOfPixel,
} from '../core/utils';
import { shardOrigin } from '../store/actions/fetch';

class ChunkLoader3D extends ChunkLoader {
  palette;

  constructor(store, canvasId, palette, canvasSize) {
    super(store, canvasId);
    this.palette = palette;
    this.canvasSize = canvasSize;
  }

  getVoxel(x, y, z) {
    const { canvasSize } = this;
    const [xc, zc] = getChunkOfPixel(canvasSize, x, y, z);
    const offset = getOffsetOfPixel(canvasSize, x, y, z);
    const key = `${xc}:${zc}`;
    const chunk = this.cget(key);
    if (chunk) {
      const clr = chunk.getVoxelByOffset(offset);
      return clr;
    }
    return 0;
  }

  getVoxelUpdate(
    xc,
    zc,
    offset,
    color,
  ) {
    const key = `${xc}:${zc}`;
    const chunk = this.cget(key);
    if (chunk) {
      chunk.setVoxelByOffset(offset, color);
    }
  }

  getChunk(xc, zc, fetch) {
    const chunkKey = `${xc}:${zc}`;
    // console.log(`Get chunk ${chunkKey}`);
    let chunk = this.cget(chunkKey);
    if (chunk) {
      if (chunk.ready) {
        chunk.touch();
        return chunk.mesh;
      }
      return null;
    }
    if (fetch) {
      // fetch chunk
      chunk = new Chunk(this.palette, chunkKey, xc, zc);
      this.cset(chunkKey, chunk);
      this.fetchChunk(xc, zc, chunk);
    }
    return null;
  }

  async fetchChunk(cx, cz, chunk) {
    this.bcReqChunk(chunk);
    try {
      const url = `${shardOrigin}/chunks/${this.canvasId}/${cx}/${cz}.bmp`;
      const response = await fetch(url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength) {
          const chunkArray = new Uint8Array(arrayBuffer);
          chunk.fromBuffer(chunkArray);
        } else {
          throw new Error('Chunk response was invalid');
        }
        this.bcRecChunk(chunk);
      } else {
        throw new Error('Network response was not ok.');
      }
    } catch (error) {
      chunk.empty();
      this.bcReqChunkFail(chunk, error);
    }
  }
}

export default ChunkLoader3D;
