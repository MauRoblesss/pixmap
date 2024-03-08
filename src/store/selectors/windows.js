/*
 * selectors for window manager
 *
 * Memoize heavy selectors or else they recalculate on any store update
 * see https://redux.js.org/usage/deriving-data-selectors
 */
import { createSelector } from 'reselect';

const selectWindows = (state) => state.windows.windows;
export const selectShowWindows = (state) => state.windows.showWindows;

export const selectIfFullscreen = createSelector(
  selectWindows,
  selectShowWindows,
  (windows, showWindows) => [
    windows.some((win) => win.fullscreen && !win.hidden) || showWindows,
    windows.some((win) => win.fullscreen && win.open && !win.hidden),
  ],
);

export const selectActiveWindowIds = createSelector(
  selectWindows,
  selectShowWindows,
  (windows, showWindows) => {
    if (!showWindows) {
      windows = windows.filter((win) => win.fullscreen);
    }
    return windows.map((win) => win.windowId);
  },
);

/*
 * function factory returning a selector for given windowId
 * use useMemo to cache result
 */
export const makeSelectWindowById = (windowId) => createSelector(
  selectWindows,
  (windows) => windows.find((win) => win.windowId === windowId),
);

/*
 * function factory for non-memorized selector
 * use useMemo to cache result
 */
// eslint-disable-next-line max-len
export const makeSelectWindowPosById = (windowId) => (state) => state.windows.positions[windowId];

// eslint-disable-next-line max-len
export const makeSelectWindowArgs = (windowId) => (state) => state.windows.args[windowId] || {};
