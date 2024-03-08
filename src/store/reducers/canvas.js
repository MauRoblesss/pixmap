import Palette from '../../core/Palette';
import {
  clamp,
  getIdFromObject,
  getHistoricalCanvasSize,
  getMaxTiledZoom,
} from '../../core/utils';


import {
  MAX_SCALE,
  DEFAULT_SCALE,
  DEFAULT_CANVAS_ID,
  DEFAULT_CANVASES,
  TILE_SIZE,
} from '../../core/constants';

/*
export type CanvasState = {
  canvasId: string,
  canvasIdent: string,
  selectedColor: number,
  is3D: boolean,
  canvasSize: number,
  canvasStartDate: string,
  palette: Palette,
  clrIgnore: number,
  view: Array,
  scale: number,
  viewscale: number,
  isHistoricalView: boolean,
  historicalCanvasSize: number,
  historicalDate: string,
  historicalTime: string,
  hover: Array,
  // object with all canvas information from all canvases like colors and size
  canvases: Object,
  // last canvas view, scale, selectedColor and viewscale
  // just used to get back to the previous coordinates when switching
  // between canvases an back
  // { 0: {scale: 12, viewscale: 12, view: [122, 1232]}, ... }
  prevCanvasCoords: Object,
  showHiddenCanvases: boolean,
};
*/

/*
 * parse url hash and sets view to coordinates
 * @param canvases Object with all canvas information
 * @return view, viewscale and scale for state
 */
function getViewFromURL(canvases) {
  const { hash } = window.location;
  try {
    const almost = decodeURIComponent(hash).substring(1)
      .split(',');

    const canvasIdent = almost[0];
    // will be null if not in DEFAULT_CANVASES
    const canvasId = getIdFromObject(canvases, almost[0]);

    // canvasId is null if canvas data isn't loaded yet and it's not
    // the default canvas.
    // aka those few milliseconds before /api/me
    const canvas = (canvasId === null)
      ? canvases[DEFAULT_CANVAS_ID]
      : canvases[canvasId];
    const clrIgnore = canvas.cli || 0;
    const {
      colors,
      sd: canvasStartDate,
      size: canvasSize,
    } = canvas;
    const is3D = !!canvas.v;

    const x = parseInt(almost[1], 10);
    const y = parseInt(almost[2], 10);
    const z = parseInt(almost[3], 10);
    if (Number.isNaN(x)
      || Number.isNaN(y)
      || (Number.isNaN(z) && is3D)
    ) {
      throw new Error('NaN');
    }
    const view = [x, y, z];

    let scale = z;
    if (!scale || Number.isNaN(scale)) {
      scale = DEFAULT_SCALE;
    } else {
      scale = 2 ** (scale / 10);
    }

    if (!is3D && canvasId !== null) {
      scale = clamp(scale, TILE_SIZE / canvasSize, MAX_SCALE);
      view.length = 2;
    }

    return {
      canvasId,
      canvasIdent,
      canvasSize,
      historicalCanvasSize: canvasSize,
      is3D,
      canvasStartDate,
      canvasMaxTiledZoom: getMaxTiledZoom(canvasSize),
      palette: new Palette(colors, 0),
      clrIgnore,
      selectedColor: clrIgnore,
      view,
      viewscale: scale,
      scale,
      canvases,
    };
  } catch (error) {
    const canvasd = canvases[DEFAULT_CANVAS_ID];
    return {
      canvasId: DEFAULT_CANVAS_ID,
      canvasIdent: canvasd.ident,
      canvasSize: canvasd.size,
      historicalCanvasSize: canvasd.size,
      is3D: !!canvasd.v,
      canvasStartDate: null,
      canvasMaxTiledZoom: getMaxTiledZoom(canvasd.size),
      palette: new Palette(canvasd.colors, 0),
      clrIgnore: canvasd.cli || 0,
      selectedColor: canvasd.cli || 0,
      view: [0, 0, 0],
      viewscale: DEFAULT_SCALE,
      scale: DEFAULT_SCALE,
      canvases,
    };
  }
}

const initialState = {
  ...getViewFromURL(DEFAULT_CANVASES),
  isHistoricalView: false,
  historicalDate: null,
  historicalTime: null,
  showHiddenCanvases: false,
  hover: null,
  prevCanvasCoords: {},
};


export default function canvasReducer(
  state = initialState,
  action,
) {
  switch (action.type) {
    case 'SET_SCALE': {
      let {
        view,
        viewscale,
      } = state;
      const {
        isHistoricalView,
      } = state;

      const canvasSize = (isHistoricalView)
        ? state.historicalCanvasSize
        : state.canvasSize;

      let [hx, hy] = view;
      let { scale } = action;
      const { zoompoint } = action;
      const minScale = (isHistoricalView) ? 0.7 : TILE_SIZE / canvasSize;
      scale = clamp(scale, minScale, MAX_SCALE);
      if (zoompoint) {
        let scalediff = viewscale;
        // clamp to 1.0 (just do this when zoompoint is given, or it would mess with phones)
        viewscale = (scale > 0.85 && scale < 1.20) ? 1.0 : scale;
        // make sure that zoompoint is on the same space
        // after zooming
        scalediff /= viewscale;
        const [px, py] = zoompoint;
        hx = px + (hx - px) * scalediff;
        hy = py + (hy - py) * scalediff;
      } else {
        viewscale = scale;
      }
      const canvasMinXY = -canvasSize / 2;
      const canvasMaxXY = canvasSize / 2 - 1;
      view = [hx, hy].map((z) => clamp(z, canvasMinXY, canvasMaxXY));
      return {
        ...state,
        view,
        scale,
        viewscale,
      };
    }

    case 'SET_HISTORICAL_TIME': {
      const {
        date,
        time,
      } = action;
      const {
        canvasSize,
        canvases,
        canvasId,
      } = state;
      const historicalCanvasSize = getHistoricalCanvasSize(
        date, canvasSize, canvases[canvasId].historicalSizes,
      );

      return {
        ...state,
        historicalCanvasSize,
        historicalDate: date,
        historicalTime: time,
      };
    }

    case 's/TGL_HISTORICAL_VIEW': {
      const {
        scale,
        viewscale,
      } = state;
      return {
        ...state,
        scale: (scale < 1.0) ? 1.0 : scale,
        viewscale: (viewscale < 1.0) ? 1.0 : viewscale,
        isHistoricalView: !state.is3D && !state.isHistoricalView,
      };
    }

    case 's/TGL_HIDDEN_CANVASES': {
      return {
        ...state,
        showHiddenCanvases: !state.showHiddenCanvases,
      };
    }

    case 'SET_VIEW_COORDINATES': {
      const { view } = action;
      const canvasSize = (state.isHistoricalView)
        ? state.historicalCanvasSize
        : state.canvasSize;
      const canvasMinXY = -canvasSize / 2;
      const canvasMaxXY = canvasSize / 2 - 1;
      const newview = view.map((z) => clamp(z, canvasMinXY, canvasMaxXY));
      return {
        ...state,
        view: newview,
      };
    }

    case 'RELOAD_URL': {
      const { canvases } = state;
      const nextstate = getViewFromURL(canvases);
      return {
        ...state,
        ...nextstate,
      };
    }

    case 'SELECT_COLOR': {
      return {
        ...state,
        selectedColor: action.color,
      };
    }

    case 'SET_HOVER': {
      const { hover } = action;
      return {
        ...state,
        hover,
      };
    }

    case 'UNSET_HOVER': {
      return {
        ...state,
        hover: null,
      };
    }

    case 's/SELECT_CANVAS': {
      let { canvasId } = action;
      const { canvases, prevCanvasCoords, canvasId: prevCanvasId } = state;
      let canvas = canvases[canvasId];
      if (!canvas) {
        canvasId = DEFAULT_CANVAS_ID;
        canvas = canvases[DEFAULT_CANVAS_ID];
      }
      const clrIgnore = canvas.cli || 0;
      const {
        size: canvasSize,
        sd: canvasStartDate,
        ident: canvasIdent,
        colors,
      } = canvas;
      const is3D = !!canvas.v;
      // get previous view, scale and viewscale if possible
      let viewscale = DEFAULT_SCALE;
      let scale = DEFAULT_SCALE;
      let view = [0, 0, 0];
      let selectedColor = clrIgnore;
      if (prevCanvasCoords[canvasId]) {
        view = prevCanvasCoords[canvasId].view;
        viewscale = prevCanvasCoords[canvasId].viewscale;
        scale = prevCanvasCoords[canvasId].scale;
        selectedColor = prevCanvasCoords[canvasId].selectedColor;
      }
      //---
      const isHistoricalView = !is3D && state.isHistoricalView;
      const historicalCanvasSize = getHistoricalCanvasSize(
        state.historicalDate,
        canvasSize,
        canvas.historicalSizes,
      );
      const palette = new Palette(colors, 0);
      if (!is3D) {
        view.length = 2;
      }
      return {
        ...state,
        canvasId,
        canvasIdent,
        selectedColor,
        canvasSize,
        is3D,
        canvasStartDate,
        palette,
        clrIgnore,
        view,
        viewscale,
        scale,
        isHistoricalView,
        historicalCanvasSize,
        // remember view, scale and viewscale
        prevCanvasCoords: {
          ...state.prevCanvasCoords,
          [prevCanvasId]: {
            view: state.view,
            scale: state.scale,
            viewscale: state.viewscale,
            selectedColor: state.selectedColor,
          },
        },
      };
    }

    case 's/REC_ME': {
      const { canvases } = action;
      let { canvasIdent, scale, view } = state;

      let canvasId = getIdFromObject(canvases, canvasIdent);
      if (canvasId === null) {
        canvasId = DEFAULT_CANVAS_ID;
        canvasIdent = canvases[DEFAULT_CANVAS_ID].ident;
      }
      const canvas = canvases[canvasId];
      const clrIgnore = canvas.cli || 0;
      const is3D = !!canvas.v;
      const {
        size: canvasSize,
        sd: canvasStartDate,
        colors,
      } = canvas;
      const palette = new Palette(colors, 0);

      if (!is3D) {
        scale = clamp(scale, TILE_SIZE / canvasSize, MAX_SCALE);
        view = [view[0], view[1]];
      }

      return {
        ...state,
        canvasId,
        canvasIdent,
        canvasSize,
        is3D,
        canvasStartDate,
        palette,
        clrIgnore,
        canvases,
        viewscale: scale,
        scale,
        view,
      };
    }

    default:
      return state;
  }
}
