/*
 * actions that are fired when received by the websocket
 */
export function socketClose() {
  return {
    type: 'w/CLOSE',
  };
}

export function socketOpen() {
  return {
    type: 'w/OPEN',
  };
}

export function receiveChatMessage(
  name,
  text,
  country,
  channel,
  user,
) {
  return (dispatch, getState) => {
    channel = Number(channel);
    const state = getState();
    let isRead;
    if (state.windows) {
      isRead = state.windows.windows.some(
        (win) => win.windowType === 'CHAT' && !win.hidden,
      ) && Object.values(state.windows.args).some(
        (args) => args.chatChannel === channel,
      );
    } else {
      isRead = state.popup.windowType === 'CHAT'
        || state.popup.args.chatChannel === channel;
    }

    // TODO ping doesn't work since update
    // const { nameRegExp } = state.user;
    // const isPing = (nameRegExp && text.match(nameRegExp));
    dispatch({
      type: 's/REC_CHAT_MESSAGE',
      name,
      text,
      country,
      channel,
      user,
      isPing: false,
      isRead,
    });
  };
}

export function receiveCoolDown(wait) {
  return {
    type: 'REC_COOLDOWN',
    wait,
  };
}

export function receiveOnline(online) {
  return {
    type: 'REC_ONLINE',
    online,
  };
}

export function addChatChannel(channel) {
  return {
    type: 's/ADD_CHAT_CHANNEL',
    channel,
  };
}

export function removeChatChannel(cid) {
  return {
    type: 's/REMOVE_CHAT_CHANNEL',
    cid,
  };
}

export function setPixelsFetching(fetching) {
  return {
    type: 'SET_PXLS_FETCHING',
    fetching,
  };
}

export function receivePlacePixels(args) {
  args.type = 'REC_SET_PXLS';
  return args;
}
