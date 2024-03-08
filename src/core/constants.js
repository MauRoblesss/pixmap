/**
 */

// canvas size (width and height) MUST be 256 * 4^n to be able to stick
// to established tiling conventions.
// (basically by sticking to that, we keep ourself many options open for the future)
// see OSM tiling: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
export const MAX_SCALE = 40; // 52 in log2
// export const DEFAULT_SCALE = 0.25; //-20 in log2
export const DEFAULT_SCALE = 3;

// default canvas that is first assumed, before real canvas data
// gets fetched via api/me
export const DEFAULT_CANVAS_ID = '0';
export const DEFAULT_CANVASES = {
  0: {
    ident: 'd',
    colors: [
      [202, 227, 255],
      [255, 255, 255],
      [255, 255, 255],
      [228, 228, 228],
      [196, 196, 196],
      [136, 136, 136],
      [78, 78, 78],
      [0, 0, 0],
      [244, 179, 174],
      [255, 167, 209],
      [255, 84, 178],
      [255, 101, 101],
      [229, 0, 0],
      [154, 0, 0],
      [254, 164, 96],
      [229, 149, 0],
      [160, 106, 66],
      [96, 64, 40],
      [245, 223, 176],
      [255, 248, 137],
      [229, 217, 0],
      [148, 224, 68],
      [2, 190, 1],
      [104, 131, 56],
      [0, 101, 19],
      [202, 227, 255],
      [0, 211, 221],
      [0, 131, 199],
      [0, 0, 234],
      [25, 25, 115],
      [207, 110, 228],
      [130, 0, 128],
    ],
    cli: 2,
    size: 65536,
    bcd: 1000,
    pcd: 2000,
    cds: 60000,
    ranked: true,
    req: -1,
    sd: '2020-01-08',
  },
};

export const TILE_LOADING_IMAGE = './loading.png';

// constants for 3D voxel canvas
export const THREE_CANVAS_HEIGHT = 128;
export const THREE_TILE_SIZE = 32;
// 2D tile size
export const TILE_SIZE = 256;
// how much to scale for a new tiled zoomlevel
export const TILE_ZOOM_LEVEL = 2;

export const COOKIE_SESSION_NAME = 'pmfun.session';

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const MONTH = 30 * DAY;

// available public Chat Channels
// at least 'en' and 'int' have to be present,
// as they get used in core/ChatProvider
export const CHAT_CHANNELS = [
  {
    name: 'en',
  }, {
    name: 'int',
  }, {
    name: 'art',
  },
];

export const MAX_CHAT_MESSAGES = 100;

export const EVENT_USER_NAME = 'event';
export const INFO_USER_NAME = 'info';
export const APISOCKET_USER_NAME = 'apisocket';

// maximum chunks to subscribe to
export const MAX_LOADED_CHUNKS = 2000;
export const MAX_CHUNK_AGE = 300000;
export const GC_INTERVAL = 300000;
