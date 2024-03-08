/*
 * Watch for filesystem changes
 */
import fs from 'fs';
import path from 'path';

import logger from './logger';
import { ASSET_DIR } from './config';

class FsWatcher {
  #path;
  #timeout = null;
  #listeners = [];
  filetypes;
  delay;

  constructor(watchPath, { delay = 5000, filetypes = [] }) {
    if (!watchPath) {
      throw new Error('Must define a path to watch');
    }
    this.#path = watchPath;
    this.delay = delay;
    this.filetypes = filetypes;
    this.initialize();
  }

  initialize() {
    const watchPath = this.#path;
    fs.watch(watchPath, (eventType, filename) => {
      if (filename && this.filetypes.length) {
        const ext = filename.split('.').pop();
        if (!this.filetypes.includes(ext)) {
          return;
        }
      }
      if (this.#timeout) {
        clearTimeout(this.#timeout);
      }
      this.#timeout = setTimeout(() => {
        logger.info('ASSET CHANGE, detected change in asset files');
        this.#listeners.forEach((cb) => cb(eventType, filename));
      }, this.delay);
    });
  }

  onChange(cb) {
    this.#listeners.push(cb);
  }
}

const assetWatcher = new FsWatcher(
  path.join(__dirname, 'public', ASSET_DIR),
  { filetypes: ['js', 'css'] },
);
export default assetWatcher;
