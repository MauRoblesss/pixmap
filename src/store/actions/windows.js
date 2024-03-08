/*
 * Actions that are exclusively used by windows
 */

export function openWindow(
  windowType,
  title = '',
  args = null,
  fullscreen = false,
  cloneable = true,
  xPos = null,
  yPos = null,
  width = null,
  height = null,
) {
  return {
    type: 'OPEN_WIN',
    windowType,
    title,
    args,
    fullscreen,
    cloneable,
    xPos,
    yPos,
    width,
    height,
  };
}

export function setWindowArgs(
  windowId,
  args,
) {
  return {
    type: 'SET_WIN_ARGS',
    windowId,
    args,
  };
}

export function closeFullscreenWindows() {
  return {
    type: 'CLOSE_FULLSCREEN_WINS',
  };
}

export function changeWindowType(
  windowId,
  windowType,
  title = '',
  args = null,
) {
  return {
    type: 'CHANGE_WIN_TYPE',
    windowId,
    windowType,
    title,
    args,
  };
}

export function setWindowTitle(windowId, title) {
  return {
    type: 'SET_WIN_TITLE',
    windowId,
    title,
  };
}

export function closeWindow(windowId) {
  return {
    type: 'CLOSE_WIN',
    windowId,
  };
}

export function removeWindow(windowId) {
  return {
    type: 'REMOVE_WIN',
    windowId,
  };
}

export function focusWindow(windowId) {
  return {
    type: 'FOCUS_WIN',
    windowId,
  };
}

export function cloneWindow(windowId) {
  return {
    type: 'CLONE_WIN',
    windowId,
  };
}

export function toggleMaximizeWindow(windowId) {
  return {
    type: 'TGL_MAXIMIZE_WIN',
    windowId,
  };
}

export function moveWindow(windowId, xDiff, yDiff) {
  return {
    type: 'MOVE_WIN',
    windowId,
    xDiff,
    yDiff,
  };
}

export function resizeWindow(windowId, xDiff, yDiff) {
  return {
    type: 'RESIZE_WIN',
    windowId,
    xDiff,
    yDiff,
  };
}

export function closeAllWindowTypes(windowType) {
  return {
    type: 'CLOSE_ALL_WIN_TYPE',
    windowType,
  };
}

export function hideAllWindowTypes(
  windowType,
  hide,
) {
  return {
    type: 'HIDE_ALL_WIN_TYPE',
    windowType,
    hide,
  };
}

export function openChatWindow() {
  const width = 350;
  const height = 350;
  return openWindow(
    'CHAT',
    '',
    null,
    false,
    true,
    window.innerWidth - width - 62,
    window.innerHeight - height - 64,
    width,
    height,
  );
}
