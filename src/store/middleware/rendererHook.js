/*
 * Hooks for renderer
 *
 */

/*
 * hooks for rendering
 */
import {
  getRenderer,
  initRenderer,
} from '../../ui/rendererFactory';

export default (store) => (next) => (action) => {
  const { type } = action;

  let prevScale = null;

  switch (type) {
    case 'SET_SCALE': {
      const state = store.getState();
      prevScale = state.canvas.viewscale;
      break;
    }

    case 'SET_HISTORICAL_TIME': {
      const state = store.getState();
      const renderer = getRenderer();
      const {
        historicalDate: oldDate,
        historicalTime: oldTime,
      } = state.canvas;
      renderer.updateOldHistoricalTime(
        oldDate,
        oldTime,
      );
      break;
    }

    default:
      // nothing
  }

  // executed after reducers
  const ret = next(action);

  const state = store.getState();

  switch (type) {
    case 'RELOAD_URL':
    case 's/SELECT_CANVAS':
    case 's/REC_ME': {
      const renderer = getRenderer();
      const { is3D } = state.canvas;

      if (is3D === renderer.is3D) {
        renderer.updateCanvasData(state);
      } else {
        initRenderer(store, is3D);
      }
      break;
    }

    case 's/TGL_HIDDEN_CANVASES': {
      const renderer = getRenderer();
      const { is3D } = state.canvas;
      if (is3D) {
        initRenderer(store, !renderer.is3D);
      }
      break;
    }

    case 'SET_HISTORICAL_TIME': {
      const {
        historicalDate,
        historicalTime,
        historicalCanvasSize,
      } = state.canvas;
      const renderer = getRenderer();
      renderer.updateHistoricalTime(
        historicalDate,
        historicalTime,
        historicalCanvasSize,
      );
      break;
    }

    case 'REQ_BIG_CHUNK':
    case 'PRE_LOADED_BIG_CHUNK':
    case 'REC_BIG_CHUNK':
    case 'REC_BIG_CHUNK_FAILURE': {
      const renderer = getRenderer();
      renderer.forceNextRender = true;
      break;
    }

    case 's/TGL_GRID':
    case 'ALLOW_SETTING_PXL': {
      const renderer = getRenderer();
      renderer.forceNextSubrender = true;
      break;
    }

    case 's/TGL_HISTORICAL_VIEW':
    case 'SET_SCALE': {
      const renderer = getRenderer();
      renderer.updateScale(state, prevScale);
      break;
    }

    case 'SET_VIEW_COORDINATES': {
      const renderer = getRenderer();
      renderer.updateView(state);
      break;
    }

    case 'REC_SET_PXLS': {
      const renderer = getRenderer();
      renderer.forceNextSubrender = true;
      const { coolDownSeconds } = action;
      if (coolDownSeconds < 0
        && renderer && renderer.controls
        && renderer.controls.gotCoolDownDelta
      ) {
        renderer.controls.gotCoolDownDelta(coolDownSeconds * -1);
      }
      break;
    }

    default:
      // nothing
  }

  return ret;
};
