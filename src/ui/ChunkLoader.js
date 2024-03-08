/*
 * parent class for storing chunks
 */
import {
  requestBigChunk,
  receiveBigChunk,
  receiveBigChunkFailure,
  removeChunks,
  // fetching of preLoad chunk triggers rerender already
  // lets keep this out for now, until needed
  // preLoadedBigChunk,
} from '../store/actions';
import {
  MAX_LOADED_CHUNKS,
  MAX_CHUNK_AGE,
} from '../core/constants';

/* eslint-disable class-methods-use-this */

class ChunkLoader {
  #store;
  // Map of chunkId: chunkRGB
  #chunks;
  #canvasId;

  constructor(store, canvasId) {
    this.#store = store;
    this.#chunks = new Map();
    this.#canvasId = canvasId;
  }

  get canvasId() {
    return this.#canvasId;
  }

  get recChunkIds() {
    const ids = [];
    this.#chunks.forEach((chunk) => {
      if (chunk.recUpdates) {
        ids.push(chunk.id);
      }
    });
    return ids;
  }

  destructor() {
    this.#chunks.forEach((chunk) => {
      chunk.destructor();
    });
    this.#chunks = new Map();
  }

  cget(key) {
    return this.#chunks.get(key);
  }

  cset(key, chunk) {
    /*
     * chunks are not necessarily fully loaded here,
     * but they are in bcRecChunk
    */
    this.#chunks.set(key, chunk);
  }

  bcReqChunk(chunk) {
    const { z, i, j } = chunk;
    this.#store.dispatch(requestBigChunk([z, i, j]));
  }

  bcRecChunk(chunk) {
    this.#store.dispatch(receiveBigChunk(chunk));
    const { size } = this.#chunks;
    if (size > MAX_LOADED_CHUNKS) {
      // hysteresis of 10%
      const amountToRem = size - Math.floor(MAX_LOADED_CHUNKS * 0.9);
      const chunksByTs = Array.from(this.#chunks.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, amountToRem);
      chunksByTs.forEach(([key]) => {
        this.#chunks.delete(key);
      });
      const remChunks = chunksByTs.map((c) => c[1]);
      this.bcRemoveChunks(remChunks);
      // eslint-disable-next-line max-len, no-console
      console.log(`Cleared ${remChunks.length} to cut amount of chunks to ${this.#chunks.size}`);
    }
  }

  /*
   * 404 (aka empty chunks) also trigger this
   */
  bcReqChunkFail(chunk, error) {
    this.#store.dispatch(receiveBigChunkFailure(chunk, error.message));
  }

  /*
   * @param chunks chunks[]
   */
  bcRemoveChunks(chunks) {
    this.#store.dispatch(removeChunks(chunks));
  }

  /*
   * delete chunks that didn't get seen for
   * more than 5min
   */
  gc(renderer) {
    const threshold = Date.now() - MAX_CHUNK_AGE;
    const chunks = this.#chunks;
    const remChunks = [];
    chunks.forEach((chunk, key) => {
      if (threshold > chunk.timestamp) {
        const {
          z,
          i,
          j,
        } = chunk;
        if (!renderer.isChunkInView(z, i, j)) {
          remChunks.push(chunk);
          chunks.delete(key);
          chunk.destructor();
        }
      }
    });
    if (remChunks.length) {
      this.bcRemoveChunks(remChunks);
    }
    // eslint-disable-next-line no-console,max-len
    console.log(`GC cleaned ${remChunks.length} / ${chunks.size + remChunks.length} chunks`);
  }
}

export default ChunkLoader;
