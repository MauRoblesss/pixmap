import { t } from 'ttag';

export function pAlert(
  title,
  message,
  alertType,
  btn = t`OK`,
) {
  return {
    type: 'ALERT',
    title,
    message,
    alertType,
    btn,
  };
}

export function closeAlert() {
  return {
    type: 'CLOSE_ALERT',
  };
}

export function toggleHistoricalView() {
  return {
    type: 's/TGL_HISTORICAL_VIEW',
  };
}

export function toggleHiddenCanvases() {
  return {
    type: 's/TGL_HIDDEN_CANVASES',
  };
}

export function toggleGrid() {
  return {
    type: 's/TGL_GRID',
  };
}

export function togglePixelNotify() {
  return {
    type: 's/TGL_PXL_NOTIFY',
  };
}

export function toggleAutoZoomIn() {
  return {
    type: 's/TGL_AUTO_ZOOM_IN',
  };
}

export function toggleOnlineCanvas() {
  return {
    type: 's/TGL_ONLINE_CANVAS',
  };
}

export function toggleMute() {
  return {
    type: 's/TGL_MUTE',
  };
}

export function toggleCompactPalette() {
  return {
    type: 's/TGL_COMPACT_PALETTE',
  };
}

export function toggleChatNotify() {
  return {
    type: 's/TGL_CHAT_NOTIFY',
  };
}

export function togglePotatoMode() {
  return {
    type: 's/TGL_POTATO_MODE',
  };
}

export function toggleLightGrid() {
  return {
    type: 's/TGL_LIGHT_GRID',
  };
}

export function toggleOpenPalette() {
  return {
    type: 's/TGL_OPEN_PALETTE',
  };
}

export function selectStyle(style) {
  return {
    type: 's/SELECT_STYLE',
    style,
  };
}

export function toggleOpenMenu() {
  return {
    type: 's/TGL_OPEN_MENU',
  };
}

export function setHover(hover) {
  return {
    type: 'SET_HOVER',
    hover,
  };
}

export function unsetHover() {
  return {
    type: 'UNSET_HOVER',
  };
}

export function setMobile(mobile) {
  return {
    type: 'SET_MOBILE',
    mobile,
  };
}

export function windowResize() {
  return {
    type: 'WIN_RESIZE',
  };
}

export function selectColor(color) {
  return {
    type: 'SELECT_COLOR',
    color,
  };
}

export function selectCanvas(canvasId) {
  return {
    type: 's/SELECT_CANVAS',
    canvasId: String(canvasId),
  };
}

export function setViewCoordinates(view) {
  return {
    type: 'SET_VIEW_COORDINATES',
    view,
  };
}

export function move([dx, dy]) {
  return (dispatch, getState) => {
    const { view } = getState().canvas;

    const [x, y] = view;
    dispatch(setViewCoordinates([x + dx, y + dy]));
  };
}

export function moveDirection([vx, vy]) {
  return (dispatch, getState) => {
    const { viewscale } = getState().canvas;

    const speed = 100.0 / viewscale;
    dispatch(move([speed * vx, speed * vy]));
  };
}

export function moveNorth() {
  return moveDirection([0, -1]);
}

export function moveWest() {
  return moveDirection([-1, 0]);
}

export function moveSouth() {
  return moveDirection([0, 1]);
}

export function moveEast() {
  return moveDirection([1, 0]);
}

export function setScale(scale, zoompoint) {
  return {
    type: 'SET_SCALE',
    scale,
    zoompoint,
  };
}

export function zoomIn(zoompoint) {
  return (dispatch, getState) => {
    const { scale } = getState().canvas;
    const zoomscale = scale >= 1.0 ? scale * 1.1 : scale * 1.04;
    dispatch(setScale(zoomscale, zoompoint));
  };
}

export function zoomOut(zoompoint) {
  return (dispatch, getState) => {
    const { scale } = getState().canvas;
    const zoomscale = scale >= 1.0 ? scale / 1.1 : scale / 1.04;
    dispatch(setScale(zoomscale, zoompoint));
  };
}

export function requestBigChunk(center) {
  return {
    type: 'REQ_BIG_CHUNK',
    center,
  };
}

export function removeChunks(chunks) {
  return {
    type: 'REMOVE_CHUNKS',
    chunks,
  };
}

export function preLoadedBigChunk(center) {
  return {
    type: 'PRE_LOADED_BIG_CHUNK',
    center,
  };
}

export function receiveBigChunk(chunk) {
  return {
    type: 'REC_BIG_CHUNK',
    chunk,
  };
}

export function receiveBigChunkFailure(chunk, error) {
  return {
    type: 'REC_BIG_CHUNK_FAILURE',
    chunk,
    error,
  };
}

export function receiveMe(
  me,
) {
  return {
    type: 's/REC_ME',
    ...me,
  };
}

export function receiveStats(
  rankings,
) {
  const {
    ranking: totalRanking,
    dailyRanking: totalDailyRanking,
    dailyCRanking,
    dailyCorRanking,
    prevTop,
    onlineStats,
    cHistStats,
    histStats,
    pDailyStats,
    pHourlyStats,
  } = rankings;
  return {
    type: 'REC_STATS',
    totalRanking,
    totalDailyRanking,
    dailyCRanking,
    dailyCorRanking,
    prevTop,
    onlineStats,
    cHistStats,
    histStats,
    pDailyStats,
    pHourlyStats,
  };
}

export function sendChatMessage(
  text,
  channel,
) {
  return {
    type: 's/REQ_CHAT_MESSAGE',
    text,
    channel,
  };
}

export function logoutUser(
) {
  return {
    type: 's/LOGOUT',
  };
}

export function loginUser(
  me,
) {
  return {
    type: 's/LOGIN',
    ...me,
  };
}

export function setName(
  name,
) {
  return {
    type: 's/SET_NAME',
    name,
  };
}

export function setMailreg(
  mailreg,
) {
  return {
    type: 's/SET_MAILREG',
    mailreg,
  };
}

export function remFromMessages(
  message,
) {
  return {
    type: 's/REM_FROM_MESSAGES',
    message,
  };
}

export function markChannelAsRead(
  cid,
) {
  return {
    type: 'MARK_CHANNEL_AS_READ',
    cid,
  };
}

function setCoolDown(coolDown) {
  return {
    type: 'COOLDOWN_SET',
    coolDown,
  };
}

function endCoolDown() {
  return {
    type: 'COOLDOWN_END',
  };
}

function getPendingActions(state) {
  const actions = [];
  const now = Date.now();

  const { wait } = state.user;

  const coolDown = wait - now;

  if (wait !== null && wait !== undefined) {
    if (coolDown > 0) actions.push(setCoolDown(coolDown));
    else actions.push(endCoolDown());
  }

  return actions;
}

export function initTimer() {
  return (dispatch, getState) => {
    function tick() {
      const state = getState();
      const actions = getPendingActions(state);
      dispatch(actions);
    }

    // something shorter than 1000 ms
    setInterval(tick, 333);
  };
}

export function blockUser(userId, userName) {
  return {
    type: 's/BLOCK_USER',
    userId,
    userName,
  };
}

export function unblockUser(userId, userName) {
  return {
    type: 's/UNBLOCK_USER',
    userId,
    userName,
  };
}

export function blockingDm(blockDm) {
  return {
    type: 's/SET_BLOCKING_DM',
    blockDm,
  };
}

export function privatize(priv) {
  return {
    type: 's/SET_PRIVATE',
    priv,
  };
}

export function muteChatChannel(cid) {
  return {
    type: 's/MUTE_CHAT_CHANNEL',
    cid,
  };
}

export function unmuteChatChannel(cid) {
  return {
    type: 's/UNMUTE_CHAT_CHANNEL',
    cid,
  };
}

export function onViewFinishChange() {
  return {
    type: 'ON_VIEW_FINISH_CHANGE',
  };
}

export function selectHistoricalTime(date, time) {
  return {
    type: 'SET_HISTORICAL_TIME',
    date,
    time,
  };
}

export function togglePencilTool() {
  return {
    type: 's/TGL_PENCILTOOL',
  };
}

export function urlChange() {
  return {
    type: 'RELOAD_URL',
  };
}

export function unload() {
  return {
    type: 't/UNLOAD',
  };
}

export function load() {
  return {
    type: 't/LOAD',
  };
}

export function propagateMe(state) {
  const {
    id,
    name,
    flag,
    createdAt,
    mailreg,
    blockDm,
    userlvl,
  } = state.user;
  const { canvases } = state.canvas;
  const {
    blocked,
    channels,
  } = state.chat;
  const {
    ranking,
    dailyRanking,
    totalPixels,
    dailyTotalPixels,
  } = state.ranks;
  return {
    type: 's/REC_ME',
    blockDm,
    blocked,
    canvases,
    channels,
    dailyRanking,
    dailyTotalPixels,
    id,
    mailreg,
    name,
    flag,
    createdAt,
    ranking,
    totalPixels,
    userlvl,
  };
}
