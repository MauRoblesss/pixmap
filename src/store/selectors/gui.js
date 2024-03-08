/*
 * selectors related to gui
 */

/* eslint-disable import/prefer-default-export */

export const selectIsDarkMode = (state) => (
  state.gui.style.indexOf('dark') !== -1
);
