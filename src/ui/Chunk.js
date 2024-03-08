/*
 * parent class for Chunk
 */

/* eslint-disable class-methods-use-this */

class Chunk {
  // if chunk receives updates via websocket
  recUpdates = false;
  // timestamp of last touch,
  // must be regularly updated for GC,
  // either by touch() or by setting directly
  timestamp;
  // coordinates
  z;
  i;
  j;

  constructor(z, i, j) {
    this.timestamp = Date.now();
    this.z = z;
    this.i = i;
    this.j = j;
  }

  get id() {
    return (this.i << 8) | this.j;
  }

  touch() {
    this.timestamp = Date.now();
  }

  destructor() {}
}

export default Chunk;
