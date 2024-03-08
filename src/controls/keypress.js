/*
 * keypress actions
 */
import { t } from 'ttag';
import copy from '../utils/clipboard';
import {
  toggleGrid,
  toggleHistoricalView,
  toggleHiddenCanvases,
  togglePixelNotify,
  toggleMute,
  selectCanvas,
  togglePencilTool,
} from '../store/actions';
import {
  notify,
} from '../store/actions/thunks';

const usedKeys = ['g', 'h', 'x', 'm', 'r', 'p'];

function createKeyPressHandler(store) {
  return (event) => {
    // ignore key presses if modal is open or chat is used
    if (event.target.nodeName === 'INPUT'
      || event.target.nodeName === 'TEXTAREA'
    ) {
      return;
    }

    let { key } = event;

    const num = Number(key);
    if (!Number.isNaN(num) && num > 0) {
      // switch to canvas on num keys
      const { canvases, canvasId: curCanvasId } = store.getState().canvas;
      const canvasIds = Object.keys(canvases).filter((id) => !canvases[id].hid);
      if (num <= canvasIds.length) {
        const canvasId = canvasIds[num - 1];
        if (canvasId !== curCanvasId) {
          store.dispatch(selectCanvas(canvasId));
          const canvasName = canvases[canvasId].title;
          store.dispatch(notify(t`Switched to ${canvasName}`));
        }
      }
      return;
    }

    /*
     * if char of key isn't used by a keybind,
     * we check if the key location is where a
     * key that is used would be on QWERTY
     */
    if (!usedKeys.includes(key)) {
      key = event.code;
      if (!key.startsWith('Key')) {
        return;
      }
      key = key.slice(-1).toLowerCase();
    }

    switch (key) {
      case 'g':
        store.dispatch(toggleGrid());
        store.dispatch(notify((store.getState().gui.showGrid)
          ? t`Grid ON`
          : t`Grid OFF`));
        return;
      case 'h':
        if (window.ssv && window.ssv.backupurl) {
          store.dispatch(toggleHistoricalView());
        }
        return;
      case 'x':
        store.dispatch(togglePixelNotify());
        store.dispatch(notify((store.getState().gui.showPixelNotify)
          ? t`Pixel Notify ON`
          : t`Pixel Notify OFF`));
        return;
      case 'm':
        store.dispatch(toggleMute());
        store.dispatch(notify((store.getState().gui.mute)
          ? t`Muted Sound`
          : t`Unmuted Sound`));
        return;
      case 'r': {
        const { hover } = store.getState().canvas;
        const text = hover.join('_');
        copy(text);
        store.dispatch(notify(t`Copied!`));
        return;
      }
      case 'p':
        store.dispatch(togglePencilTool());
        store.dispatch(notify((store.getState().gui.pencilTool)
          ? t`Pencil ON`
          : t`Pencil OFF`));
        break;
      default:
    }
  };
}

export default createKeyPressHandler;
