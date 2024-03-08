/*
 * Controls for 2D canvases
 *
 * keycodes:
 * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
 *
 */

import {
  setHover,
  unsetHover,
  setViewCoordinates,
  setScale,
  zoomIn,
  zoomOut,
  selectColor,
  moveNorth,
  moveWest,
  moveSouth,
  moveEast,
  onViewFinishChange,
} from '../store/actions';
import pixelTransferController from '../ui/PixelTransferController';
import {
  screenToWorld,
  getChunkOfPixel,
  getOffsetOfPixel,
} from '../core/utils';

class PixelPainterControls {
  constructor(renderer, viewport, curStore) {
    this.store = curStore;
    this.renderer = renderer;
    this.viewport = viewport;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onAuxClick = this.onAuxClick.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);

    this.onViewFinishChangeTimeOut = null;

    this.clickTapStartView = [0, 0];
    this.clickTapStartTime = 0;
    this.clickTapStartCoords = [0, 0];
    this.tapStartDist = 50;
    this.tapStartScale = this.store.getState().scale;
    // on mouse: true as long as left mouse button is pressed
    // on touch: set to true when one finger touches the screen
    //           set to false when second finger touches or touch ends
    this.isClicking = false;
    // on touch: true if more than one finger on screen
    this.isMultiTab = false;
    // on touch: timeout to detect long-press
    this.tapTimeout = null;
    /*
     * if we are shift-hold-painting
     * 0: no
     * 1: left shift
     * 2: right shift
     */
    this.holdPainting = 0;
    // if we are waiting before placing pixel via holdPainting again
    this.coolDownDelta = false;

    document.addEventListener('keydown', this.onKeyDown, false);
    document.addEventListener('keyup', this.onKeyUp, false);
    viewport.addEventListener('auxclick', this.onAuxClick, false);
    viewport.addEventListener('mousedown', this.onMouseDown, false);
    viewport.addEventListener('mousemove', this.onMouseMove, false);
    viewport.addEventListener('mouseup', this.onMouseUp, false);
    viewport.addEventListener('wheel', this.onWheel, false);
    viewport.addEventListener('touchstart', this.onTouchStart, false);
    viewport.addEventListener('touchend', this.onTouchEnd, false);
    viewport.addEventListener('touchmove', this.onTouchMove, false);
    viewport.addEventListener('mouseout', this.onMouseOut, false);
    viewport.addEventListener('touchcancel', this.onMouseOut, false);
  }

  dispose() {
    document.removeEventListener('keydown', this.onKeyDown, false);
    document.removeEventListener('keyup', this.onKeyUp, false);
  }

  gotCoolDownDelta(delta) {
    this.coolDownDelta = true;
    setTimeout(() => {
      this.coolDownDelta = false;
    }, delta * 1000);
  }

  onMouseDown(event) {
    event.preventDefault();
    document.activeElement.blur();

    if (event.button === 0) {
      clearTimeout(this.onViewFinishChangeTimeOut);
      this.isClicking = true;
      const { clientX, clientY } = event;
      this.clickTapStartTime = Date.now();
      this.clickTapStartCoords = [clientX, clientY];
      this.clickTapStartView = this.store.getState().canvas.view;
      const { viewport } = this;
      setTimeout(() => {
        if (this.isClicking) {
          viewport.style.cursor = 'move';
        }
      }, 300);
    }
  }

  /*
   * try to avoid updating history too often
   */
  scheduleOnViewFinishChange() {
    if (this.onViewFinishChangeTimeOut) {
      clearTimeout(this.onViewFinishChangeTimeOut);
    }
    this.onViewFinishChangeTimeOut = setTimeout(() => {
      this.store.dispatch(onViewFinishChange());
    }, 500);
  }

  onMouseUp(event) {
    event.preventDefault();

    const { store } = this;
    if (event.button === 0) {
      this.isClicking = false;
      const { clientX, clientY } = event;
      const { clickTapStartCoords, clickTapStartTime } = this;
      const coordsDiff = [
        clickTapStartCoords[0] - clientX,
        clickTapStartCoords[1] - clientY,
      ];
      // thresholds for single click / holding
      if (clickTapStartTime > Date.now() - 250
        && coordsDiff[0] < 2 && coordsDiff[1] < 2) {
        const state = store.getState();
        const cell = screenToWorld(
          state,
          this.viewport,
          [clientX, clientY],
        );
        PixelPainterControls.placePixel(
          store,
          this.renderer,
          cell,
        );
      }
      this.viewport.style.cursor = 'auto';
    }
    this.scheduleOnViewFinishChange();
  }

  static getTouchCenter(event) {
    switch (event.touches.length) {
      case 1: {
        const { pageX, pageY } = event.touches[0];
        return [pageX, pageY];
      }
      case 2: {
        const pageX = Math.floor(0.5
            * (event.touches[0].pageX + event.touches[1].pageX));
        const pageY = Math.floor(0.5
            * (event.touches[0].pageY + event.touches[1].pageY));
        return [pageX, pageY];
      }
      default:
        break;
    }
    return null;
  }

  /*
   * place pixel
   * either with given colorIndex or with selected color if none is given
   */
  static placePixel(store, renderer, cell, colorIndex = null) {
    const state = store.getState();
    const { autoZoomIn } = state.gui;
    const { clrIgnore } = state.canvas;
    const {
      scale,
      isHistoricalView,
    } = state.canvas;
    const selectedColor = (colorIndex === null)
      ? state.canvas.selectedColor
      : colorIndex;

    if (isHistoricalView) return;

    if (autoZoomIn && scale < 8) {
      store.dispatch(setViewCoordinates(cell));
      store.dispatch(setScale(12));
      return;
    }

    // allow placing of pixel just on low zoomlevels
    if (scale < 3) return;

    const curColor = renderer.getColorIndexOfPixel(...cell);
    if (selectedColor === curColor) {
      return;
    }

    // placing unset pixel
    if (selectedColor < clrIgnore) {
      const { palette } = state.canvas;
      const { rgb } = palette;
      let clrOffset = selectedColor * 3;
      const r = rgb[clrOffset++];
      const g = rgb[clrOffset++];
      const b = rgb[clrOffset];
      if (palette.getIndexOfColor(r, g, b) === curColor) {
        return;
      }
    }

    const { canvasSize } = state.canvas;
    const [x, y] = cell;

    // apu link
    // 5275_-8713
    // 5398_-8614
    if (x > 5275 && y > -8713 && x < 5398 && y < -8614) {
      if (state.canvas.canvasId === '0') {
        window.location.href = 'https://files.catbox.moe/gh2wtr.mp4';
        return;
      }
    }

    const maxCoords = canvasSize / 2;
    if (x < -maxCoords || x >= maxCoords || y < -maxCoords || y >= maxCoords) {
      return;
    }
    const [i, j] = getChunkOfPixel(canvasSize, x, y);
    const offset = getOffsetOfPixel(canvasSize, x, y);
    pixelTransferController.tryPlacePixel(
      i, j, offset,
      selectedColor,
      curColor,
    );
  }

  static getMultiTouchDistance(event) {
    if (event.touches.length < 2) {
      return 1;
    }
    const a = event.touches[0];
    const b = event.touches[1];
    return Math.sqrt(
      (b.pageX - a.pageX) ** 2 + (b.pageY - a.pageY) ** 2,
    );
  }

  onTouchStart(event) {
    event.preventDefault();
    event.stopPropagation();
    document.activeElement.blur();

    clearTimeout(this.onViewFinishChangeTimeOut);
    this.clickTapStartTime = Date.now();
    this.clickTapStartCoords = PixelPainterControls.getTouchCenter(event);
    const state = this.store.getState();
    this.clickTapStartView = state.canvas.view;

    if (event.touches.length > 1) {
      this.tapStartScale = state.canvas.scale;
      this.tapStartDist = PixelPainterControls.getMultiTouchDistance(event);
      this.isMultiTab = true;
      this.clearTabTimeout();
    } else {
      this.isClicking = true;
      this.isMultiTab = false;
      this.tapTimeout = setTimeout(() => {
        // check for longer tap to select taped color
        PixelPainterControls.selectColor(
          this.store,
          this.viewport,
          this.renderer,
          this.clickTapStartCoords,
        );
      }, 600);
    }
  }

  onTouchEnd(event) {
    event.preventDefault();
    event.stopPropagation();

    const { store } = this;
    const state = store.getState();

    if (!state.gui.pencilTool && event.touches.length === 0 && this.isClicking) {
      const { pageX, pageY } = event.changedTouches[0];
      const { clickTapStartCoords, clickTapStartTime } = this;
      const coordsDiff = [
        clickTapStartCoords[0] - pageX,
        clickTapStartCoords[1] - pageY,
      ];
      // thresholds for single click / holding
      if (clickTapStartTime > Date.now() - 580
        && coordsDiff[0] < 2 && coordsDiff[1] < 2) {
        const { viewport } = this;
        const state = store.getState();
        const cell = screenToWorld(
          state,
          viewport,
          [pageX, pageY],
        );
        PixelPainterControls.placePixel(
          store,
          this.renderer,
          cell,
        );
        setTimeout(() => {
          store.dispatch(unsetHover());
        }, 500);
      }
    }
    this.scheduleOnViewFinishChange();
    this.clearTabTimeout();
  }


  onTouchMove(event) {
    event.preventDefault();
    event.stopPropagation();

    const multiTouch = (event.touches.length > 1);

    const [clientX, clientY] = PixelPainterControls.getTouchCenter(event);
    const { store } = this;
    const state = store.getState();

    // pencil
    if (state.gui.pencilTool) {
      const { pageX, pageY } = event.changedTouches[0];
      const { clickTapStartCoords, clickTapStartTime } = this;
      const coordsDiff = [
        clickTapStartCoords[0] - pageX,
        clickTapStartCoords[1] - pageY,
      ];
      // thresholds for single click / holding
      // if (clickTapStartTime > Date.now() - 580
      //   && coordsDiff[0] < 2 && coordsDiff[1] < 2) {
        const { viewport } = this;
        const state = store.getState();
        const cell = screenToWorld(
          state,
          viewport,
          [pageX, pageY],
        );
        PixelPainterControls.placePixel(
          store,
          this.renderer,
          cell,
        );
        setTimeout(() => {
          store.dispatch(unsetHover());
        }, 500);
      // }
      this.scheduleOnViewFinishChange();
      this.clearTabTimeout();
      //
    } else {  
      
      if (this.isMultiTab !== multiTouch) {
        // if one finger got lifted or added, reset clickTabStart
        this.isMultiTab = multiTouch;
        this.clickTapStartCoords = [clientX, clientY];
        this.clickTapStartView = state.canvas.view;
        this.tapStartDist = PixelPainterControls.getMultiTouchDistance(event);
        this.tapStartScale = state.canvas.scale;
      } else {
        // pan
        const { clickTapStartView, clickTapStartCoords } = this;
        const [lastPosX, lastPosY] = clickTapStartView;

        const deltaX = clientX - clickTapStartCoords[0];
        const deltaY = clientY - clickTapStartCoords[1];
        if (deltaX > 2 || deltaY > 2) {
          this.clearTabTimeout();
        }
        const { scale } = state.canvas;
        store.dispatch(setViewCoordinates([
          lastPosX - (deltaX / scale),
          lastPosY - (deltaY / scale),
        ]));

        // pinch
        if (multiTouch) {
          this.clearTabTimeout();

          const a = event.touches[0];
          const b = event.touches[1];
          const { tapStartDist, tapStartScale } = this;
          const dist = Math.sqrt(
            (b.pageX - a.pageX) ** 2 + (b.pageY - a.pageY) ** 2,
          );
          const pinchScale = dist / tapStartDist;
          store.dispatch(setScale(tapStartScale * pinchScale));
        }
      }
    }
  }

  clearTabTimeout() {
    this.isClicking = false;
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout);
      this.tapTimeout = null;
    }
  }

  onWheel(event) {
    event.preventDefault();
    document.activeElement.blur();

    const { deltaY } = event;
    const { store } = this;
    const state = store.getState();
    const { hover } = state.canvas;
    let zoompoint = null;
    if (hover) {
      zoompoint = hover;
    }
    if (deltaY < 0) {
      store.dispatch(zoomIn(zoompoint));
    }
    if (deltaY > 0) {
      store.dispatch(zoomOut(zoompoint));
    }
    this.scheduleOnViewFinishChange();
  }

  onMouseMove(event) {
    event.preventDefault();

    const { clientX, clientY } = event;
    const { store, isClicking } = this;
    const state = store.getState();
    if (isClicking) {
      if (Date.now() < this.clickTapStartTime + 100) {
        // 100ms threshold till starting to pan
        return;
      }
      const { clickTapStartView, clickTapStartCoords } = this;
      const [lastPosX, lastPosY] = clickTapStartView;
      const deltaX = clientX - clickTapStartCoords[0];
      const deltaY = clientY - clickTapStartCoords[1];

      const { scale } = state.canvas;
      store.dispatch(setViewCoordinates([
        lastPosX - (deltaX / scale),
        lastPosY - (deltaY / scale),
      ]));
    } else {
      const { hover } = state.canvas;
      const screenCoor = screenToWorld(
        state,
        this.viewport,
        [clientX, clientY],
      );
      const [x, y] = screenCoor;

      /* out of bounds check */
      const { canvasSize } = state.canvas;
      const maxCoords = canvasSize / 2;
      if (x < -maxCoords || x >= maxCoords
        || y < -maxCoords || y >= maxCoords
      ) {
        if (hover) {
          store.dispatch(unsetHover());
        }
        return;
      }

      if (!hover || hover[0] !== x || hover[1] !== y) {
        if (state.gui.pencilTool && this.holdPainting === 0) {
          this.holdPainting = 1;
        } 
        
        store.dispatch(setHover(screenCoor));
        /* shift placing */
        if (!this.coolDownDelta) {
          switch (this.holdPainting) {
            case 1: {
              /* left shift: from selected color */
              PixelPainterControls.placePixel(
                store,
                this.renderer,
                screenCoor,
              );
              break;
            }
            case 2: {
              /* right shift: from historical view */
              const colorIndex = this.renderer
                .getColorIndexOfPixel(x, y, true);
              if (colorIndex !== null) {
                PixelPainterControls.placePixel(
                  store,
                  this.renderer,
                  screenCoor,
                  colorIndex,
                );
              }
              break;
            }
            default:
          }
        }
      }
    }
  }

  onMouseOut() {
    const { store, viewport } = this;
    viewport.style.cursor = 'auto';
    store.dispatch(unsetHover());
    this.holdPainting = 0;
    this.clearTabTimeout();
  }

  static selectColor(store, viewport, renderer, center) {
    const state = store.getState();
    if (state.canvas.scale < 3) {
      return;
    }
    const coords = screenToWorld(state, viewport, center);
    const clrIndex = renderer.getColorIndexOfPixel(...coords);
    if (clrIndex !== null) {
      store.dispatch(selectColor(clrIndex));
    }
  }

  onAuxClick(event) {
    const { which, clientX, clientY } = event;
    // middle mouse button
    if (which !== 2) {
      return;
    }
    event.preventDefault();

    PixelPainterControls.selectColor(
      this.store,
      this.viewport,
      this.renderer,
      [clientX, clientY],
    );
  }

  onKeyUp(event) {
    switch (event.key) {
      case 'Shift':
      case 'CapsLock':
        this.holdPainting = 0;
        break;
      default:
    }
  }

  onKeyDown(event) {
    // ignore key presses if modal is open or chat is used
    if (event.target.nodeName === 'INPUT'
      || event.target.nodeName === 'TEXTAREA'
    ) {
      return;
    }
    const { store } = this;

    /*
     * key location
     */
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        store.dispatch(moveNorth());
        return;
      case 'ArrowLeft':
      case 'KeyA':
        store.dispatch(moveWest());
        return;
      case 'ArrowDown':
      case 'KeyS':
        store.dispatch(moveSouth());
        return;
      case 'ArrowRight':
      case 'KeyD':
        store.dispatch(moveEast());
        return;
      case 'KeyE':
        store.dispatch(zoomIn());
        return;
      case 'KeyQ':
        store.dispatch(zoomOut());
        return;
      default:
    }

    /*
     * key char
     */
    switch (event.key) {
      case '+':
        store.dispatch(zoomIn());
        break;
      case '-':
        store.dispatch(zoomOut());
        break;
      case 'Control':
      case 'Shift': {
        const state = store.getState();
        const { hover } = state.canvas;
        if (hover) {
          if (event.key === 'Control') {
            // ctrl
            const clrIndex = this.renderer.getColorIndexOfPixel(...hover);
            store.dispatch(selectColor(clrIndex));
            return;
          }
          if (event.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT) {
            // left shift
            this.holdPainting = 1;
            PixelPainterControls.placePixel(store, this.renderer, hover);
            return;
          }
          if (event.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
            // right shift
            this.holdPainting = 2;
            const colorIndex = this.renderer
              .getColorIndexOfPixel(...hover, true);
            if (colorIndex !== null) {
              PixelPainterControls.placePixel(
                store,
                this.renderer,
                hover,
                colorIndex,
              );
            }
          }
        }
        break;
      }
      default:
    }

    let keyi = event.code;
    keyi = keyi.slice(-1).toLowerCase();
    switch (keyi) {
      case 'p': {
        this.holdPainting = 0;
      }
      break;
    default:
    }
  }
}

export default PixelPainterControls;
