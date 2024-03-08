/*
 * Control incoming and outgoing pixels,
 * do client prediction, send to draw on renderer
 */
import { t } from 'ttag';
import {
  pAlert,
} from '../store/actions';
import {
  setPixelsFetching,
  receivePlacePixels,
} from '../store/actions/socket';
import {
  notify,
} from '../store/actions/thunks';

class PixelTransferController {
  constructor() {
    this.requestFromQueue = this.requestFromQueue.bind(this);
    /*
     * cache of pixels that still are to set
     * [{i: i, j: j, pixels: [[offset, color],...]}, ...]
     */
    this.pixelQueue = [];
    /*
     * requests that got predicted on client and yet have to be
     * received from the server
     * [[i, j, offset, colorold, colornew], ...]
     */
    this.clientPredictions = [];
    /*
     * allow extensions to hook into pixel updates
     */
    this.extension = null;
    window.registerPixelUpdates = (cb) => {
      this.extension = cb;
    };
  }

  initialize(store, socketClient, getRenderer) {
    this.store = store;
    this.socketClient = socketClient;
    this.getRenderer = getRenderer;
  }

  /*
   * request pixel placement from queue
   */
  async requestFromQueue() {
    const { store } = this;
    if (!this.pixelQueue.length) {
      store.dispatch(setPixelsFetching(false));
      return;
    }

    store.dispatch(setPixelsFetching(true));
    const { i, j, pixels } = this.pixelQueue.shift();

    let ret;
    try {
      ret = await this.socketClient.sendPixelUpdate(i, j, pixels);
    } catch {
      // timeout
      ret = {
        retCode: 16,
        coolDownSeconds: 0,
        pxlCnt: 0,
      };
      store.dispatch(pAlert(
        t`Error :(`,
        t`Didn't get an answer from pixmap. Maybe try to refresh?`,
        'error',
      ));
    }

    const {
      retCode,
      coolDownSeconds,
      pxlCnt,
    } = ret;

    if (coolDownSeconds) {
      store.dispatch(notify(coolDownSeconds));
    }

    if (pxlCnt < pixels.length) {
      /*
       * one or more pixels didn't get set,
       * revert predictions and clean queue
       */
      const [offset] = pixels[pxlCnt];
      this.revertPredictionsAt(i, j, offset);
      this.pixelQueue = [];
    }

    let errorTitle = null;
    let msg = null;
    let type = 'error';
    switch (retCode) {
      case 0:
        break;
      case 1:
        errorTitle = t`Invalid Canvas`;
        msg = t`This canvas doesn't exist`;
        break;
      case 2:
        errorTitle = t`Invalid Coordinates`;
        msg = t`x out of bounds`;
        break;
      case 3:
        errorTitle = t`Invalid Coordinates`;
        msg = t`y out of bounds`;
        break;
      case 4:
        errorTitle = t`Invalid Coordinates`;
        msg = t`z out of bounds`;
        break;
      case 5:
        errorTitle = t`Wrong Color`;
        msg = t`Invalid color selected`;
        break;
      case 6:
        errorTitle = t`Just for registered Users`;
        msg = t`You have to be logged in to place on this canvas`;
        break;
      case 7:
        errorTitle = t`Place more :)`;
        // eslint-disable-next-line max-len
        msg = t`You can not access this canvas yet. You need to place more pixels`;
        break;
      case 8:
        store.dispatch(notify(t`Pixel protected!`));
        break;
      case 9:
        // pixelstack used up
        break;
      case 10:
        errorTitle = 'Captcha';
        msg = t`Please prove that you are human`;
        type = 'captcha';
        break;
      case 11:
        errorTitle = t`No Proxies Allowed :(`;
        msg = t`You are using a Proxy.`;
        break;
      case 12:
        errorTitle = t`Not allowed`;
        msg = t`Just the Top10 of yesterday can place here`;
        break;
      case 13:
        errorTitle = t`You are weird`;
        // eslint-disable-next-line max-len
        msg = t`Server got confused by your pixels. Are you playing on multiple devices?`;
        break;
      case 14:
        errorTitle = t`Banned`;
        type = 'ban';
        break;
      case 15:
        errorTitle = t`Range Banned`;
        msg = t`Your Internet Provider is banned from playing this game`;
        break;
      case 16:
        errorTitle = t`Timeout`;
        // eslint-disable-next-line max-len
        msg = t`Didn't get an answer from pixmapmap. Maybe try to refresh if problem persists?`;
        break;
      default:
        errorTitle = t`Weird`;
        msg = t`Couldn't set Pixel`;
    }

    if (msg || errorTitle) {
      store.dispatch(pAlert(
        (errorTitle || t`Error ${retCode}`),
        msg,
        type,
      ));
    }

    store.dispatch(receivePlacePixels(ret));
    setTimeout(this.requestFromQueue, 100);
  }

  /*
   * Revert predictions starting at given pixel
   * @param i, j, offset data of the first pixel that got rejected
   */
  revertPredictionsAt(sI, sJ, sOffset) {
    const renderer = this.getRenderer();
    const { clientPredictions } = this;
    let p = 0;
    while (p < clientPredictions.length) {
      const predPxl = clientPredictions[p];
      if (predPxl[0] === sI
        && predPxl[1] === sJ
        && predPxl[2] === sOffset
      ) {
        break;
      }
      p += 1;
    }

    const spliceIndex = p;
    while (p < clientPredictions.length) {
      const [i, j, offset, color] = clientPredictions[p];
      renderer.renderPixel(i, j, offset, color, false);
      p += 1;
    }

    this.clientPredictions.splice(spliceIndex);
  }

  /*
   * got pixel update from websocket
   */
  receivePixelUpdate({
    i,
    j,
    pixels,
  }) {
    if (this.extension) {
      this.extension(i, j, pixels);
    }
    pixels.forEach((pxl) => {
      const [offset, color] = pxl;
      const { clientPredictions } = this;
      for (let p = 0; p < clientPredictions.length; p += 1) {
        const predPxl = clientPredictions[p];
        if (predPxl[0] === i
          && predPxl[1] === j
          && predPxl[2] === offset
        ) {
          if (predPxl[4] === color) {
            clientPredictions.splice(p, 1);
          } else {
            predPxl[3] = color;
          }
          return;
        }
      }
      this.getRenderer().renderPixel(i, j, offset, color, true);
    });
  }

  /*
   * try to place a pixel
   */
  tryPlacePixel(
    i,
    j,
    offset,
    color,
    curColor,
  ) {
    this.getRenderer().renderPixel(i, j, offset, color, false);
    this.clientPredictions.push([i, j, offset, curColor, color]);
    const { pixelQueue } = this;

    if (pixelQueue.length) {
      const lastReq = pixelQueue[pixelQueue.length - 1];
      const { i: lastI, j: lastJ } = lastReq;
      if (i === lastI && j === lastJ) {
        /* append to last request in queue if same chunk */
        lastReq.pixels.push([offset, color]);
        return;
      }
    }

    pixelQueue.push({
      i,
      j,
      pixels: [[offset, color]],
    });

    if (!this.store.getState().fetching.fetchingPixel) {
      this.requestFromQueue();
    }
  }
}

export default new PixelTransferController();
