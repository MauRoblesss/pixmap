/*
 * Hooks for websocket client for popup window
 *
 */

import SocketClient from '../../socket/SocketClient';

export default (store) => (next) => (action) => {
  if (SocketClient.readyState === WebSocket.CLOSED) {
    if (action.type === 't/PARENT_CLOSED') {
      SocketClient.initialize(store);
    }
  } else {
    switch (action.type) {
      case 's/SET_NAME':
      case 's/LOGIN':
      case 's/LOGOUT': {
        SocketClient.reconnect();
        break;
      }

      case 's/REQ_CHAT_MESSAGE': {
        const {
          text,
          channel,
        } = action;
        SocketClient.sendChatMessage(text, channel);
        break;
      }

      default:
      // nothing
    }
  }

  return next(action);
};
