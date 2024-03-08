/*
 * check if cross-origin request
 * see:
 * https://medium.com/@albertogasparin/manipulating-cross-origin-images-with-html-canvas-1e3e8780964c
 */
const corsRegEx = /^([\w]+:)?\/\//;
function isCors(url) {
  return corsRegEx && url.replace(corsRegEx, '').indexOf(window.location.host);
}

/*
 * general function for async loading images
 * @param url url of image
 * @return Promise<Image>
 */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => {
      reject(new Error(`Failed to load image's URL: ${url}`));
    });
    if (isCors(url)) {
      img.crossOrigin = 'anonymous';
    }
    img.src = url;
  });
}

/*
 * loading tiles that get temporarily shown till real tile is loaded
 */
class LoadingTiles {
  tiles; // Object

  constructor() {
    this.tiles = {};
    this.loadLoadingTile(0);
  }

  getTile(canvasId) {
    if (typeof this.tiles[canvasId] === 'undefined') {
      this.loadLoadingTile(canvasId);
    }
    return this.tiles[canvasId] || this.tiles[0] || null;
  }

  async loadLoadingTile(canvasId) {
    if (this.tiles[canvasId] === null) {
      return;
    }
    this.tiles[canvasId] = null;
    this.tiles[canvasId] = await loadImage(`./loading${canvasId}.png`);
  }
}

export const loadingTiles = new LoadingTiles();
