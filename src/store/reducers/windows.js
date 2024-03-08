/*
 * state for open windows and its content
 */

import { clamp } from '../../core/utils';

const SCREEN_MARGIN_S = 30;
const SCREEN_MARGIN_EW = 70;
const MIN_WIDTH = 70;
const MIN_HEIGHT = 50;
// if screen smaller than this, hide all windows and just
// allow Modals
const SCREEN_WIDTH_THRESHOLD = 604;
// how many windows can be open
const MAX_AMOUNT_WINS = 100;

function generateWindowId(state) {
  let windowId = Math.floor(Math.random() * 99999) + 1;
  while (state.args[windowId]) {
    windowId += 1;
  }
  return windowId;
}

/*
 * clamp size and position to screen borders and restrictions
 */
function clampSize(prefWidth, prefHeight, margin = false) {
  let maxWidth = window.innerWidth;
  let maxHeight = window.innerHeight;
  if (margin) {
    // same as modal in default.css
    maxWidth = Math.floor(maxWidth * 0.70);
    maxHeight = Math.floor(Math.min(maxHeight * 0.80, 900));
  }
  const width = prefWidth || maxWidth;
  const height = prefHeight || maxHeight;
  return [
    clamp(
      width,
      MIN_WIDTH,
      maxWidth,
    ),
    clamp(
      height,
      MIN_HEIGHT,
      maxHeight,
    ),
  ];
}

function clampPos(prefXPos, prefYPos, width, height) {
  const xPos = (prefXPos || prefXPos === 0) ? prefXPos
    : Math.floor((window.innerWidth - width) / 2);
  const yPos = (prefYPos || prefYPos === 0) ? prefYPos
    : Math.floor((window.innerHeight - height) / 2);
  return [
    clamp(
      xPos,
      SCREEN_MARGIN_EW - width,
      window.innerWidth - SCREEN_MARGIN_EW,
    ),
    clamp(
      yPos,
      0,
      window.innerHeight - SCREEN_MARGIN_S,
    ),
  ];
}

/*
 * correct window positions according to screen size
 * to make sure that none if off-screen
 */
function correctPositions(state) {
  const {
    innerWidth: width,
    innerHeight: height,
  } = window;

  const { windows: newWindows, positions } = state;
  const xMax = width - SCREEN_MARGIN_EW;
  const yMax = height - SCREEN_MARGIN_S;
  const yMin = 0;

  let modified = false;
  const newPositions = {};
  for (let i = 0; i < newWindows.length; i += 1) {
    const id = newWindows[i].windowId;
    const {
      xPos,
      yPos,
      width: winWidth,
      height: winHeight,
    } = positions[id];
    const xMin = SCREEN_MARGIN_EW - winWidth;
    if (xPos > xMax || yPos > yMax
      || xPos < xMin || yPos < yMin
      || width > winWidth || height > winHeight) {
      modified = true;
      newPositions[id] = {
        xPos: clamp(xPos, xMin, xMax),
        yPos: clamp(yPos, yMin, yMax),
        width: Math.min(winWidth, width - SCREEN_MARGIN_S),
        height: Math.min(winHeight, height - SCREEN_MARGIN_S),
        z: positions[id].z,
      };
    } else {
      newPositions[id] = positions[id];
    }
  }

  if (!modified) {
    return state;
  }
  return {
    ...state,
    positions: newPositions,
  };
}

/*
 * resort the zIndex, remove gaps
 */
function sortWindows(newState, force = false) {
  if (newState.zMax >= MAX_AMOUNT_WINS * 0.5 || force) {
    const positions = { ...newState.positions };
    const ids = Object.keys(positions);
    const orderedZ = ids
      .map((id) => positions[id].z)
      .sort((a, b) => !b || (a && a >= b));
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      positions[id] = {
        ...positions[id],
        z: orderedZ.indexOf(positions[id].z),
      };
    }
    newState.zMax = orderedZ.length - 1;
    newState.positions = positions;
  }
  return newState;
}

const initialState = {
  // if windows get shown, false on small screens
  showWindows: window.innerWidth > SCREEN_WIDTH_THRESHOLD,
  // highest zIndex of window
  zMax: 0,
  // [
  //   {
  //     windowId: number,
  //     open: boolean,
  //     hidden: boolean,
  //     fullscreen: boolean,
  //     windowType: string,
  //     title: string,
  //       title that is additionally shown to the window-type-title
  //     cloneable: boolean,
  //   },
  // ]
  windows: [],
  // {
  //   windowId: {
  //     width: number,
  //     height: number,
  //     xPos: percentage,
  //     yPos: percentage,
  //     z: number,
  //   }
  // }
  positions: {},
  // {
  //   windowId: {
  //    ...
  //   }
  // }
  // args is a object with values defining a state of the window
  // and can be set by the window itself,
  // in order to remember stuff on cloning, maximizing, etc.
  // Mostly it is empty or null
  args: {},
};

export default function windows(
  state = initialState,
  action,
) {
  switch (action.type) {
    case 'OPEN_WIN': {
      /*
       * preferred xPos, yPos, height adn width
       * can be given in action (but doesn't have to)
       */
      const {
        windowType,
        title,
        cloneable,
        args,
        xPos: prefXPos,
        yPos: prefYPos,
        width: prefWidth,
        height: prefHeight,
      } = action;

      const [width, height] = clampSize(prefWidth, prefHeight, true);
      const [xPos, yPos] = clampPos(prefXPos, prefYPos, width, height);

      const fullscreen = !state.showWindows || action.fullscreen;

      if (state.windows.length >= MAX_AMOUNT_WINS) {
        return state;
      }
      const windowId = generateWindowId(state);
      const newZMax = state.zMax + 1;

      return sortWindows({
        ...state,
        zMax: newZMax,
        windows: [
          ...state.windows,
          {
            windowId,
            windowType,
            open: true,
            hidden: false,
            fullscreen,
            title,
            cloneable,
          },
        ],
        args: {
          ...state.args,
          [windowId]: {
            ...args,
          },
        },
        positions: {
          ...state.positions,
          [windowId]: {
            width,
            height,
            xPos,
            yPos,
            z: newZMax,
          },
        },
      });
    }

    case 'REMOVE_WIN': {
      const {
        windowId,
      } = action;
      const args = { ...state.args };
      const positions = { ...state.positions };
      delete args[windowId];
      delete positions[windowId];

      return {
        ...state,
        windows: state.windows.filter((win) => win.windowId !== windowId),
        args,
        positions,
      };
    }

    case 'CLOSE_WIN': {
      const {
        windowId,
      } = action;

      const newWindows = state.windows.map((win) => {
        if (win.windowId !== windowId) return win;
        return {
          ...win,
          open: false,
        };
      });

      return {
        ...state,
        windows: newWindows,
      };
    }

    case 'CLOSE_ALL_WIN_TYPE': {
      const {
        windowType,
      } = action;
      const newWindows = state.windows.map((win) => {
        if (win.windowType !== windowType) return win;
        return {
          ...win,
          open: false,
        };
      });

      return {
        ...state,
        windows: newWindows,
      };
    }

    case 'HIDE_ALL_WIN_TYPE': {
      const {
        windowType,
        hide,
      } = action;
      const newWindows = state.windows.map((win) => {
        if (win.windowType !== windowType) return win;
        return {
          ...win,
          hidden: hide,
        };
      });
      return {
        ...state,
        windows: newWindows,
      };
    }

    case 'CLONE_WIN': {
      const {
        windowId,
      } = action;
      const win = state.windows.find((w) => w.windowId === windowId);
      const position = state.positions[windowId];
      const newWindowId = generateWindowId(state);
      const newZMax = state.zMax + 1;
      const {
        innerWidth: width,
        innerHeight: height,
      } = window;
      return sortWindows({
        ...state,
        zMax: newZMax,
        windows: [
          ...state.windows,
          {
            ...win,
            windowId: newWindowId,
          },
        ],
        args: {
          ...state.args,
          [newWindowId]: {
            ...state.args[windowId],
          },
        },
        positions: {
          ...state.positions,
          [newWindowId]: {
            ...position,
            xPos: Math.min(position.xPos + 15, width - SCREEN_MARGIN_EW),
            yPos: Math.min(position.yPos + 15, height - SCREEN_MARGIN_S),
            z: newZMax,
          },
        },
      });
    }

    case 'CHANGE_WIN_TYPE': {
      const {
        windowId,
        windowType,
        title,
      } = action;
      const args = {
        ...state.args,
        [windowId]: {
          ...action.args,
        },
      };
      const newWindows = state.windows.map((win) => {
        if (win.windowId !== windowId) return win;
        return {
          ...win,
          windowType,
          title,
        };
      });

      return {
        ...state,
        args,
        windows: newWindows,
      };
    }

    case 'FOCUS_WIN': {
      const {
        windowId,
      } = action;
      const {
        zMax,
      } = state;
      const { z } = state.positions[windowId];
      if (z === zMax) {
        return state;
      }
      return sortWindows({
        ...state,
        zMax: zMax + 1,
        positions: {
          ...state.positions,
          [windowId]: {
            ...state.positions[windowId],
            z: zMax + 1,
          },
        },
      });
    }

    case 'TGL_MAXIMIZE_WIN': {
      const {
        windowId,
      } = action;

      const newWindows = state.windows.map((win) => {
        if (win.windowId !== windowId) return win;
        return {
          ...win,
          fullscreen: !win.fullscreen,
          open: true,
          hidden: false,
        };
      });

      return {
        ...state,
        windows: newWindows,
      };
    }

    case 'CLOSE_FULLSCREEN_WINS': {
      const newWindows = state.windows.map((win) => {
        if (win.fullscreen) {
          return {
            ...win,
            open: false,
          };
        }
        return win;
      });

      return {
        ...state,
        windows: newWindows,
      };
    }

    case 'MOVE_WIN': {
      const {
        windowId,
        xDiff,
        yDiff,
      } = action;
      let {
        xPos, yPos,
      } = state.positions[windowId];
      const {
        width, height,
      } = state.positions[windowId];
      [xPos, yPos] = clampPos(xPos + xDiff, yPos + yDiff, width, height);
      return {
        ...state,
        positions: {
          ...state.positions,
          [windowId]: {
            ...state.positions[windowId],
            xPos,
            yPos,
          },
        },
      };
    }

    case 'RESIZE_WIN': {
      const {
        windowId,
        xDiff,
        yDiff,
      } = action;
      let { width, height } = state.positions[windowId];
      [width, height] = clampSize(width + xDiff, height + yDiff, false);
      return {
        ...state,
        positions: {
          ...state.positions,
          [windowId]: {
            ...state.positions[windowId],
            width,
            height,
          },
        },
      };
    }

    case 'persist/REHYDRATE': {
      const { showWindows } = state;
      if (!showWindows || action.key !== 'wind') {
        // don't persist on small screens
        return state;
      }

      const loadedState = {
        ...state,
        ...action.payload,
      };
      const args = { ...loadedState.args };
      const positions = { ...loadedState.positions };

      const newWindows = loadedState.windows.filter((win) => {
        if (win.open && (win.fullscreen || showWindows)) {
          return true;
        }
        // eslint-disable-next-line no-console
        console.log(
          `Cleaning up window from previous session: ${win.windowId}`,
        );
        delete args[win.windowId];
        delete positions[win.windowId];
        return false;
      });

      return sortWindows(correctPositions({
        ...loadedState,
        windows: newWindows,
        args,
        positions,
      }));
    }

    case 'WIN_RESIZE': {
      const showWindows = window.innerWidth > SCREEN_WIDTH_THRESHOLD;
      if (!showWindows) {
        return {
          ...state,
          showWindows,
        };
      }
      const newState = (showWindows === state.showWindows)
        ? state
        : {
          ...state,
          showWindows,
        };
      return correctPositions(newState);
    }


    case 'SET_WIN_TITLE': {
      const {
        windowId,
        title,
      } = action;
      const newWindows = state.windows.map((win) => {
        if (win.windowId !== windowId) return win;
        return {
          ...win,
          title,
        };
      });
      return {
        ...state,
        windows: newWindows,
      };
    }

    case 'SET_WIN_ARGS': {
      const {
        windowId,
        args,
      } = action;
      return {
        ...state,
        args: {
          ...state.args,
          [windowId]: {
            ...state.args[windowId],
            ...args,
          },
        },
      };
    }

    default:
      return state;
  }
}
