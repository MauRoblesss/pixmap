/*
 * local save state for chat stuff
 *
 */

const TIME_DIFF_THRESHOLD = 15000;

const initialState = {
  // channels that are muted
  // [cid, cid2, ...]
  mute: [],
  // timestamps of last read
  // {cid: lastTs, ...}
  readTs: {},
  // booleans if channel is unread
  // {cid: unread, ...}
  unread: {},
};


export default function chatRead(
  state = initialState,
  action,
) {
  switch (action.type) {
    case 's/REC_ME':
    case 's/LOGIN': {
      const { channels } = action;
      const cids = Object.keys(channels);
      const readTs = {};
      const unread = {};
      for (let i = 0; i < cids.length; i += 1) {
        const cid = cids[i];
        if (!state.readTs[cid]) {
          readTs[cid] = 0;
        } else {
          readTs[cid] = state.readTs[cid];
        }
        unread[cid] = (channels[cid][2] > readTs[cid]);
      }
      return {
        ...state,
        readTs,
        unread,
      };
    }

    case 's/ADD_CHAT_CHANNEL': {
      const [cid] = Object.keys(action.channel);
      return {
        ...state,
        readTs: {
          ...state.readTs,
          [cid]: state.readTs[cid] || 0,
        },
        unread: {
          ...state.unread,
          [cid]: true,
        },
      };
    }

    case 's/REMOVE_CHAT_CHANNEL': {
      const { cid } = action;
      if (!state.readTs[cid]) {
        return state;
      }
      const readTs = { ...state.readTs };
      delete readTs[cid];
      const unread = { ...state.unread };
      delete unread[cid];
      return {
        ...state,
        readTs,
        unread,
      };
    }

    case 's/REC_CHAT_MESSAGE': {
      const { channel: cid, isRead } = action;
      const readTs = isRead
        ? {
          ...state.readTs,
          // 15s threshold for desync
          [cid]: Date.now() + TIME_DIFF_THRESHOLD,
        } : state.readTs;
      const unread = isRead
        ? state.unread
        : {
          ...state.unread,
          [cid]: true,
        };
      return {
        ...state,
        readTs,
        unread,
      };
    }

    case 'OPEN_WIN': {
      const { windowType } = action;
      if (windowType !== 'CHAT') {
        return state;
      }
      const cid = (action.args && action.args.chatChannel) || 1;
      return {
        ...state,
        readTs: {
          ...state.readTs,
          [cid]: Date.now() + TIME_DIFF_THRESHOLD,
        },
        unread: {
          ...state.unread,
          [cid]: false,
        },
      };
    }

    case 'MARK_CHANNEL_AS_READ': {
      const { cid } = action;
      return {
        ...state,
        readTs: {
          ...state.readTs,
          [cid]: Date.now() + TIME_DIFF_THRESHOLD,
        },
        unread: {
          ...state.unread,
          [cid]: false,
        },
      };
    }

    case 's/MUTE_CHAT_CHANNEL': {
      const { cid } = action;
      return {
        ...state,
        mute: [
          ...state.mute,
          cid,
        ],
      };
    }

    case 's/UNMUTE_CHAT_CHANNEL': {
      const { cid } = action;
      const mute = state.mute.filter((id) => (id !== cid));
      return {
        ...state,
        mute,
      };
    }

    default:
      return state;
  }
}
