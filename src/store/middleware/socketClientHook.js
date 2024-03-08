/*
 * Hooks for websocket client to store changes
 *
 */

import SocketClient from '../../socket/SocketClient';

export default (store) => (next) => (action) => {
  switch (action.type) {
    case 'REC_BIG_CHUNK':
    case 'REC_BIG_CHUNK_FAILURE': {
      const { chunk } = action;
      if (chunk.recUpdates) {
        SocketClient.registerChunk(action.chunk.id);
      }
      break;
    }

    case 'REMOVE_CHUNKS': {
      const { chunks } = action;
      const ids = chunks
        .filter((chunk) => chunk.recUpdates)
        .map((chunk) => chunk.id);
      if (ids.length) {
        SocketClient.deRegisterChunks(ids);
      }
      break;
    }

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

    case 'RELOAD_URL':
    case 's/SELECT_CANVAS':
    case 's/REC_ME': {
      const prevState = store.getState();
      const ret = next(action);
      const state = store.getState();
      const { canvasId } = state.canvas;
      if (prevState.canvas.canvasId !== canvasId) {
        SocketClient.setCanvas(canvasId);
      }
      return ret;
    }

    default:
    // nothing
  }

  return next(action);
};
