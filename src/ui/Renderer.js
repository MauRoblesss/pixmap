/*
 * parent class for Renderer
 */

/* eslint-disable class-methods-use-this */

class Renderer {
  store;
  // needs to be known for lazy loading THREE
  is3D = null;
  // chunk loader must be set by subclass
  chunkLoader = null;

  constructor(store) {
    this.store = store;
  }

  get chunks() {
    return this.chunkLoader.chunks;
  }

  get recChunkIds() {
    if (!this.chunkLoader) {
      return [];
    }
    return this.chunkLoader.recChunkIds;
  }

  destructor() {
    if (this.chunkLoader) {
      this.chunkLoader.destructor();
    }
  }

  render() {}

  renderPixel() {}

  updateCanvasData() {}

  isChunkInView() {
    return true;
  }

  gc() {
    if (!this.chunkLoader) {
      return;
    }
    this.chunkLoader.gc(this);
  }
}

export default Renderer;
