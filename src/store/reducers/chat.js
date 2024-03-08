import { MAX_CHAT_MESSAGES } from '../../core/constants';

const initialState = {
  /*
   * {
   *   cid: [
   *     name,
   *     type,
   *     lastTs,
   *   ],
   *   cid2: [
   *     name,
   *     type,
   *     lastTs,
   *     dmUserId,
   *   ],
   *   ...
   * }
   */
  channels: {},
  // [[uId, userName], [userId2, userName2],...]
  blocked: [],
  // { cid: [message1,message2,message3,...]}
  messages: {},
};

// used to give every message a unique incrementing key
let msgId = 0;

export default function chat(
  state = initialState,
  action,
) {
  switch (action.type) {
    case 's/REC_ME':
    case 's/LOGIN': {
      // making sure object keys are numbers
      const channels = {};
      const channelsJson = action.channels;
      const cids = Object.keys(channelsJson);
      for (let i = 0; i < cids.length; i += 1) {
        const cid = cids[i];
        channels[Number(cid)] = channelsJson[cid];
      }
      return {
        ...state,
        channels,
        blocked: action.blocked,
      };
    }

    case 's/LOGOUT': {
      const channels = { ...state.channels };
      const messages = { ...state.messages };
      const keys = Object.keys(channels);
      for (let i = 0; i < keys.length; i += 1) {
        const cid = keys[i];
        if (channels[cid][1] !== 0) {
          delete messages[cid];
          delete channels[cid];
        }
      }
      return {
        ...state,
        channels,
        blocked: [],
        messages,
      };
    }

    case 's/BLOCK_USER': {
      const { userId, userName } = action;
      const blocked = [
        ...state.blocked,
        [userId, userName],
      ];
      /*
       * remove DM channel if exists
       */
      const channels = { ...state.channels };
      const chanKeys = Object.keys(channels);
      for (let i = 0; i < chanKeys.length; i += 1) {
        const cid = chanKeys[i];
        if (channels[cid][1] === 1 && channels[cid][3] === userId) {
          delete channels[cid];
          return {
            ...state,
            channels,
            blocked,
          };
        }
      }
      return {
        ...state,
        blocked,
      };
    }

    case 's/UNBLOCK_USER': {
      const { userId } = action;
      const blocked = state.blocked.filter((bl) => (bl[0] !== userId));
      return {
        ...state,
        blocked,
      };
    }

    case 's/ADD_CHAT_CHANNEL': {
      const { channel } = action;
      const cid = Number(Object.keys(channel)[0]);
      if (state.channels[cid]) {
        return state;
      }
      return {
        ...state,
        channels: {
          ...state.channels,
          ...channel,
        },
      };
    }

    case 's/REMOVE_CHAT_CHANNEL': {
      const { cid } = action;
      if (!state.channels[cid]) {
        return state;
      }
      const channels = { ...state.channels };
      const messages = { ...state.messages };
      delete messages[cid];
      delete channels[cid];
      return {
        ...state,
        channels,
        messages,
      };
    }

    case 's/REC_CHAT_MESSAGE': {
      const {
        name, text, country, channel, user,
      } = action;
      if (!state.messages[channel] || !state.channels[channel]) {
        return state;
      }
      const ts = Math.round(Date.now() / 1000);
      msgId += 1;
      const messages = {
        ...state.messages,
        [channel]: [
          ...state.messages[channel],
          [name, text, country, user, ts, msgId],
        ],
      };
      if (messages[channel].length > MAX_CHAT_MESSAGES) {
        messages[channel].splice(0, 2);
      }

      /*
       * update timestamp of last message
       */
      const channelArray = [...state.channels[channel]];
      channelArray[2] = Date.now();

      return {
        ...state,
        channels: {
          ...state.channels,
          [channel]: channelArray,
        },
        messages,
      };
    }

    case 's/REC_CHAT_HISTORY': {
      const { cid, history } = action;
      for (let i = 0; i < history.length; i += 1) {
        msgId += 1;
        history[i].push(msgId);
      }
      return {
        ...state,
        messages: {
          ...state.messages,
          [cid]: history,
        },
      };
    }

    default:
      return state;
  }
}
