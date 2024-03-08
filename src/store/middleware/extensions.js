/*
 * sends events via window.pixelPlanetEvents to potential
 * Extensions and Userscripts
 * Also check out ui/PixelTransferController.js, which sends received
 * pixels to a window.registerPixelUpdates callback
 *
 */

import EventEmitter from 'events';

const pixelPlanetEvents = new EventEmitter();

export default () => (next) => (action) => {
  switch (action.type) {
    case 's/SELECT_CANVAS': {
      pixelPlanetEvents.emit('selectcanvas', action.canvasId);
      break;
    }

    case 'SET_VIEW_COORDINATES': {
      /*
       * view: [x, y] float canvas coordinates of the center of the screen,
       */
      pixelPlanetEvents.emit('setviewcoordinates', action.view);
      break;
    }

    case 'SET_HOVER': {
      /*
       * hover: [x, y] integer canvas coordinates of cursor
       * just used on 2D canvas
       */
      pixelPlanetEvents.emit('sethover', action.hover);
      break;
    }

    case 'SET_SCALE': {
      /*
       * scale: float of canvas scale aka zoom
       *        (not logarithmic, doesn't clamp to 1.0)
       * zoompoint: center of scaling
       */
      const { scale, zoompoint } = action;
      pixelPlanetEvents.emit('setscale', scale, zoompoint);
      break;
    }

    case 'REC_BIG_CHUNK': {
      /*
       * chunk: ChunkRGB or ChunkRGB3D object,
       *        see ui/ChunkRGB.js and ui/ChunkRGB3D.js
       */
      pixelPlanetEvents.emit('receivechunk', action.chunk);
      break;
    }

    default:
      // nothing
  }

  return next(action);
};

window.pixelPlanetEvents = pixelPlanetEvents;
