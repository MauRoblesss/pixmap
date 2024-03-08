/*
 * Actions that are used only within popup
 */

export function setWindowArgs(args) {
  return {
    type: 'SET_WIN_ARGS',
    args,
  };
}

export function setWindowTitle(title) {
  return {
    type: 'SET_WIN_TITLE',
    title,
  };
}

export function changeWindowType(
  windowType,
  title = '',
  args = null,
) {
  return {
    type: 'CHANGE_WIN_TYPE',
    windowType,
    title,
    args,
  };
}

