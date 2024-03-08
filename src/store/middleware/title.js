/**
 * set URL in address bar, theme-color and title
 */

import {
  durationToString,
} from '../../core/utils';

/*
 * set theme-color meta tag that sets the color
 * of address bars on phones
 */
function setThemeColorMeta(r, g, b) {
  const metaThemeColor = document.querySelector('meta[name=theme-color]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', `rgb(${r}, ${g}, ${b})`);
  }
}

const TITLE = 'PixMap.fun';

let lastTitle = null;

export default (store) => (next) => (action) => {
  const ret = next(action);

  switch (action.type) {
    case 'COOLDOWN_SET': {
      const { coolDown } = store.getState().user;
      const title = `${durationToString(coolDown, true)} | ${TITLE}`;
      if (lastTitle === title) break;
      lastTitle = title;
      document.title = title;
      break;
    }

    case 'COOLDOWN_END': {
      document.title = TITLE;
      break;
    }


    case 's/SELECT_CANVAS':
    case 's/REC_ME':
    case 'RELOAD_URL':
    case 'ON_VIEW_FINISH_CHANGE': {
      const state = store.getState();

      const {
        view,
        viewscale,
        canvasIdent,
        is3D,
      } = state.canvas;

      if (action.type !== 'ON_VIEW_FINISH_CHANGE') {
        const [r, g, b] = state.canvas.palette.rgb;
        setThemeColorMeta(r, g, b);
      }

      const coords = view.map((u) => Math.round(u)).join(',');
      let newhash = `#${canvasIdent},${coords}`;
      if (!is3D) {
        const scale = Math.round(Math.log2(viewscale) * 10);
        newhash += `,${scale}`;
      }
      window.history.replaceState(undefined, undefined, newhash);
      break;
    }

    default:
    // nothing
  }

  return ret;
};
