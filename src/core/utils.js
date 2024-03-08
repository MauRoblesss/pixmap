
import {
  TILE_SIZE,
  THREE_TILE_SIZE,
  TILE_ZOOM_LEVEL,
} from './constants';

// emojis list
export const EMOJIS_LIST = ['androidpro', 'catmiau', 'dem', 'e', 'iwantoenditall', 'lol', 'mad', 'miau', 'myrn', 'okay', 'pepechrist', 'pepesad', 'uou', 'troll', 'pixmap']

/**
 * http://stackoverflow.com/questions/4467539/javascript-modulo-not-behaving
 * @param n
 * @param m
 * @returns {number} remainder
 */
export function mod(n, m) {
  return ((n % m) + m) % m;
}

/*
 * returns random integer
 * @param min Minimum of random integer
 * @param max Maximum of random integer
 * @return random integer between min and max (min <= ret <= max)
 */
export function getRandomInt(min, max) {
  const range = max - min + 1;
  return min + (Math.floor(Math.random() * range));
}

/*
 * generates random string with a-z,0-9
 * 11 chars length
 */
export function getRandomString() {
  return Math.random().toString(36).substring(2, 15);
}

export function distMax([x1, y1], [x2, y2]) {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(n, max));
}

/*
 * convert YYYY-MM-DD to YYYYMMDD
 */
export function dateToString(date) {
  // YYYY-MM-DD
  return date.substring(0, 4) + date.substring(5, 7) + date.substring(8);
}

/*
 * get current date in YYYY-MM-DD
 */
export function getToday() {
  const date = new Date();
  let day = date.getDate();
  let month = date.getMonth() + 1;
  if (month < 10) month = `0${month}`;
  if (day < 10) day = `0${day}`;
  return `${date.getFullYear()}-${month}-${day}`;
}

// z is assumed to be height here
// in ui and renderer, y is height
export function getChunkOfPixel(
  canvasSize,
  x,
  y,
  z = null,
) {
  const tileSize = (z === null) ? TILE_SIZE : THREE_TILE_SIZE;
  const width = (z == null) ? y : z;
  const cx = Math.floor((x + (canvasSize / 2)) / tileSize);
  const cy = Math.floor((width + (canvasSize / 2)) / tileSize);
  return [cx, cy];
}

// get coordinates of top-left corner of chunk
export function getCornerOfChunk(
  canvasSize,
  i,
  j,
  is3d = false,
) {
  const tileSize = (is3d) ? THREE_TILE_SIZE : TILE_SIZE;
  const x = (i * tileSize) - (canvasSize / 2);
  const y = (j * tileSize) - (canvasSize / 2);
  return [x, y, 0];
}

export function getTileOfPixel(
  tileScale,
  pixel,
  canvasSize = null,
) {
  return pixel.map(
    (x) => Math.floor((x + canvasSize / 2) / TILE_SIZE * tileScale),
  );
}

export function getMaxTiledZoom(canvasSize) {
  if (!canvasSize) return 0;
  return Math.log2(canvasSize / TILE_SIZE) / TILE_ZOOM_LEVEL * 2;
}

export function getHistoricalCanvasSize(
  historicalDate,
  canvasSize,
  historicalSizes,
) {
  if (historicalDate && historicalSizes) {
    let i = historicalSizes.length;
    while (i > 0) {
      i -= 1;
      const [date, size] = historicalSizes[i];
      if (historicalDate <= date) {
        return size;
      }
    }
  }
  return canvasSize;
}

export function getCanvasBoundaries(canvasSize) {
  const canvasMinXY = -canvasSize / 2;
  const canvasMaxXY = canvasSize / 2 - 1;
  return [canvasMinXY, canvasMaxXY];
}

// z is assumed to be height here
// in ui and renderer, y is height
export function getOffsetOfPixel(
  canvasSize,
  x,
  y,
  z = null,
) {
  const tileSize = (z === null) ? TILE_SIZE : THREE_TILE_SIZE;
  const width = (z == null) ? y : z;
  let offset = (z === null) ? 0 : (y * tileSize * tileSize);
  const modOffset = mod((canvasSize / 2), tileSize);
  const cx = mod(x + modOffset, tileSize);
  const cy = mod(width + modOffset, tileSize);
  offset += (cy * tileSize) + cx;
  return offset;
}

/*
 * Searches Object for element with ident string and returns its key
 * Used for getting canvas id from given ident-string (see canvases.json)
 * @param obj Object
 * @param ident ident string
 * @return key
 */
export function getIdFromObject(obj, ident) {
  const ids = Object.keys(obj);
  for (let i = 0; i < ids.length; i += 1) {
    const key = ids[i];
    if (obj[key].ident === ident) {
      return key;
    }
  }
  return null;
}

// z is returned as height here
// in ui and renderer, y is height
export function getPixelFromChunkOffset(
  i,
  j,
  offset,
  canvasSize,
  is3d = false,
) {
  const tileSize = (is3d) ? THREE_TILE_SIZE : TILE_SIZE;
  const cx = offset % tileSize;
  const off = offset - cx;
  let cy = off % (tileSize * tileSize);
  const z = (is3d) ? (off - cy) / tileSize / tileSize : null;
  cy /= tileSize;

  const devOffset = canvasSize / 2 / tileSize;
  const x = ((i - devOffset) * tileSize) + cx;
  const y = ((j - devOffset) * tileSize) + cy;
  return [x, y, z];
}

export function getCellInsideChunk(
  canvasSize,
  pixel,
) {
  return pixel.map((x) => mod(x + canvasSize / 2, TILE_SIZE));
}

export function screenToWorld(
  state,
  $viewport,
  [x, y],
) {
  const { view, viewscale } = state.canvas;
  const [viewX, viewY] = view;
  const { width, height } = $viewport;
  return [
    Math.floor(((x - (width / 2)) / viewscale) + viewX),
    Math.floor(((y - (height / 2)) / viewscale) + viewY),
  ];
}

export function worldToScreen(
  state,
  $viewport,
  [x, y],
) {
  const { view, viewscale } = state.canvas;
  const [viewX, viewY] = view;
  const { width, height } = $viewport;
  return [
    ((x - viewX) * viewscale) + (width / 2),
    ((y - viewY) * viewscale) + (height / 2),
  ];
}

/*
 * parses duration to string
 * in xx:xx format with min:sec
 */
export function durationToString(
  ms,
  smallest = false,
) {
  const seconds = Math.ceil(ms / 1000);
  let timestring;
  if (seconds < 60 && smallest) {
    timestring = seconds;
  } else {
    // eslint-disable-next-line max-len
    timestring = `${Math.floor(seconds / 60)}:${(`0${seconds % 60}`).slice(-2)}`;
  }
  return timestring;
}

/*
 * parses a large duration to
 * [x]h [y]min [z]sec format
 */
export function largeDurationToString(
  ts,
) {
  const seconds = ts % 60;
  let durs = (ts - seconds) / 60;
  const minutes = durs % 60;
  durs = (durs - minutes) / 60;
  const hours = durs % 24;
  durs = (durs - hours) / 24;
  const days = durs;
  let out = '';
  if (days) {
    out += ` ${days}d`;
  }
  if (hours) {
    out += ` ${hours}h`;
  }
  if (minutes) {
    out += ` ${minutes}min`;
  }
  if (seconds) {
    out += ` ${seconds}s`;
  }
  return out;
}

const postfix = ['k', 'M', 'B'];
export function numberToString(num) {
  if (!num) {
    return 'N/A';
  }
  if (num < 1000) {
    return num;
  }
  let postfixNum = 0;
  while (postfixNum < postfix.length) {
    if (num < 10000) {
      // eslint-disable-next-line max-len
      return `${Math.floor(num / 1000)}.${(`0${Math.floor((num % 1000) / 10)}`).slice(-2)}${postfix[postfixNum]}`;
    } if (num < 100000) {
      // eslint-disable-next-line max-len
      return `${Math.floor(num / 1000)}.${Math.floor((num % 1000) / 100)}${postfix[postfixNum]}`;
    } if (num < 1000000) {
      return Math.floor(num / 1000) + postfix[postfixNum];
    }
    postfixNum += 1;
    num = Math.round(num / 1000);
  }
  return '';
}

export function numberToStringFull(num) {
  if (num < 0) {
    return `${num} :-(`;
  } if (num < 1000) {
    return num;
  } if (num < 1000000) {
    return `${Math.floor(num / 1000)}.${(`00${String(num % 1000)}`).slice(-3)}`;
  }

  // eslint-disable-next-line max-len
  return `${Math.floor(num / 1000000)}.${(`00${String(Math.floor(num / 1000))}`).slice(-3)}.${(`00${String(num % 1000)}`).slice(-3)}`;
}

/*
 * generates a color based on a given string
 */
export function colorFromText(str) {
  if (!str) return '#000000';

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const c = (hash & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();

  return `#${`00000${c}`.slice(-6)}`;
}

/*
 * sets a color into bright or dark mode
 */
export function setBrightness(hex, dark = false) {
  hex = hex.replace(/^\s*#|\s*$/g, '');

  if (hex.length === 3) {
    hex = hex.replace(/(.)/g, '$1$1');
  }

  let r = Math.floor(parseInt(hex.substring(0, 2), 16) / 2);
  let g = Math.floor(parseInt(hex.substring(2, 4), 16) / 2);
  let b = Math.floor(parseInt(hex.substring(4, 6), 16) / 2);
  if (dark) {
    r += 128;
    g += 128;
    b += 128;
  }
  r = `0${r.toString(16)}`.slice(-2);
  g = `0${g.toString(16)}`.slice(-2);
  b = `0${b.toString(16)}`.slice(-2);
  return `#${r}${g}${b}`;
}

/*
 * escape string for use in markdown
 */
export function escapeMd(string) {
  const toEscape = ['\\', '[', ']', '(', ')', '*', '~', '+', '_', '\n'];
  let result = '';
  let ss = 0;
  for (let c = 0; c < string.length; c += 1) {
    const chr = string[c];
    if (toEscape.includes(chr)) {
      result += `${string.slice(ss, c)}\\`;
      ss = c;
    }
  }
  if (ss === 0) {
    return string;
  }
  result += string.slice(ss);
  return result;
}

/*
 * escape string for use in regexp
 * @param string input string
 * @return escaped string
 */
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/*
 * check if webGL2 is available
 * @return boolean true if available
 */
export function isWebGL2Available() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

/*
 * gets a descriptive text of the domain of the link
 * Example:
 *  https://www.youtube.com/watch?v=G8APgeFfkAk returns 'youtube'
 *  http://www.google.at returns 'google.at'
 *  (www. and .com are split)
 */
export function getLinkDesc(link) {
  let domainStart = link.indexOf('://') + 3;
  if (domainStart < 3) {
    domainStart = 0;
  }
  if (link.startsWith('www.', domainStart)) {
    domainStart += 4;
  }
  let domainEnd = link.indexOf('/', domainStart);
  if (domainEnd === -1) {
    domainEnd = link.length;
  }
  if (link.endsWith('.com', domainEnd)) {
    domainEnd -= 4;
  }
  if (domainEnd <= domainStart) {
    return link;
  }
  return link.slice(domainStart, domainEnd);
}

/*
 * try to get extension out of link
 * @param link url
 * @return extension or null if not available
 */
export function getExt(link) {
  let paramStart = link.indexOf('&');
  if (paramStart === -1) {
    paramStart = link.length;
  }
  let posDot = paramStart - 1;
  for (;posDot >= 0 && link[posDot] !== '.'; posDot -= 1) {
    if (link[posDot] === '/') {
      return null;
    }
  }
  posDot += 1;
  if (paramStart - posDot > 4) {
    return null;
  }
  return link.slice(posDot, paramStart);
}

/*
 * Split query part from link
 * @param link url
 * @return link without query
 */
export function stripQuery(link) {
  let posAnd = link.indexOf('?');
  if (posAnd === -1) posAnd = link.indexOf('#');
  return (posAnd === -1) ? link : link.substring(0, posAnd);
}

/*
 * convert timestamp to human readable date/time string
 * @param timestamp Unix timestamp in seconds
 * @return descriptive string of time
 */
export function getDateTimeString(timestamp) {
  const curDate = new Date();
  const date = new Date(timestamp * 1000);
  if (date.getDate() !== curDate.getDate()) {
    return date.toLocaleString();
  }
  return date.toLocaleTimeString();
}

/*
 * parse interval in s/m/h form to timestamp
 * @param interval string like "2d"
 * @return timestamp of now - interval
 */
export function parseInterval(interval) {
  if (!interval) {
    return 0;
  }
  const lastChar = interval.slice(-1).toLowerCase();
  const num = parseInt(interval.slice(0, -1), 10);
  if (Number.isNaN(num) || num <= 0 || num > 600
    || !['s', 'm', 'h', 'd'].includes(lastChar)) {
    return 0;
  }
  let factor = 1000;
  if (lastChar === 'm') {
    factor *= 60;
  } else if (lastChar === 'h') {
    factor *= 3600;
  } else if (lastChar === 'd') {
    factor *= 3600 * 24;
  }
  return (num * factor);
}

/*
 * combines tables
 * a tables is an object with {
 *   columns: Array,
 *   types: Array,
 *   rows: Array,
 * }
 */
export function combineTables(a, b) {
  let bTable;
  if (a.columns.length === b.columns.length) {
    a.rows = a.rows.concat(b.rows);
    bTable = a;
  } else {
    let sTable;
    if (a.columns.length < b.columns.length) {
      bTable = b;
      sTable = a;
    } else {
      bTable = a;
      sTable = b;
    }
    if (!sTable.rows.length) {
      return bTable;
    }
    const newRows = [];
    for (let i = 0; i < sTable.rows.length; i += 1) {
      newRows.push([]);
    }
    for (let i = 0; i < bTable.columns.length; i += 1) {
      const colInd = sTable.columns.indexOf(bTable.columns[i]);
      if (~colInd) {
        for (let u = 0; u < sTable.rows.length; u += 1) {
          newRows[u].push(sTable.rows[u][colInd]);
        }
      } else {
        for (let u = 0; u < sTable.rows.length; u += 1) {
          newRows[u].push(null);
        }
      }
    }
    bTable.rows = bTable.rows.concat(newRows);
  }
  if (bTable.columns[0] === 'rid') {
    // make sure that row-ids are unique
    bTable.rows.forEach((row, i) => { row[0] = i; });
  }
  const amountCol = bTable.columns.indexOf('#');
  if (~amountCol) {
    // sum amounts of duplicates if possible
    let sumCol = bTable.columns.indexOf('canvas');
    if (sumCol === -1) sumCol = bTable.columns.indexOf('IID');
    if (~sumCol) {
      const timeCol = bTable.columns.indexOf('time');
      for (let i = 0; i < bTable.rows.length; i += 1) {
        const aCol = bTable.rows[i];
        const val = aCol[sumCol];
        if (val && val !== 'N/A') {
          for (let u = i + 1; u < bTable.rows.length; u += 1) {
            const bCol = bTable.rows[u];
            if (bCol[sumCol] === val) {
              const amount = aCol[amountCol] + bCol[amountCol];
              if (~timeCol && aCol[timeCol] < bCol[timeCol]) {
                bTable.rows[i] = bCol;
              }
              bTable.rows.splice(u, 1);
              bTable.rows[i][amountCol] = amount;
              u -= 1;
            }
          }
        }
      }
    }
  }
  return bTable;
}

/*
 * combine two similar objects
 */
export function combineObjects(a, b) {
  if (!b) {
    return a;
  }
  if (!a) {
    return b;
  }
  if (Array.isArray(a)) {
    return a.concat(b);
  }
  if (typeof a === 'object') {
    const keys = Object.keys(a);
    if (keys.includes('columns')) {
      return combineTables(a, b);
    }
    keys.forEach((key) => {
      const u = a[key];
      const v = b[key];
      a[key] = combineObjects(u, v);
    });
    return a;
  }
  return a + b;
}

/*
 * get YYYYMMDD of timestamp
 */
export function getDateKeyOfTs(ts) {
  const date = new Date(ts);
  let day = date.getUTCDate();
  if (day < 10) day = `0${day}`;
  let month = date.getUTCMonth() + 1;
  if (month < 10) month = `0${month}`;
  const year = date.getUTCFullYear();
  return `${year}${month}${day}`;
}

/*
 * check if parent window exists and
 * is accessible
 */
export function parentExists() {
  try {
    return !(!window.opener
      || window.opener.closed
      || !window.opener.location
      || window.opener.location.origin !== window.location.origin);
  } catch {
    return false;
  }
}

/*
* get emojis
* Verificar se o emoji existe na lista
*/
export function getEmoji(emoji) {
  const emojiList = EMOJIS_LIST;

  if(emojiList.indexOf(emoji)>=0){
    return true
  } else {
    return false
  }
}