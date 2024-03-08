const initialState = {
  id: null,
  name: null,
  flag: 'xx',
  createdAt: null,
  wait: null,
  coolDown: null, // ms
  lastCoolDownEnd: null,
  // messages are sent by api/me, like not_verified status
  messages: [],
  mailreg: false,
  // blocking all Dms
  blockDm: false,
  // profile is private
  priv: false,
  // if user is using touchscreen
  isOnMobile: false,
  // small notifications for received cooldown
  notification: null,
  // 1: Admin, 2: Mod, 0: ordinary user
  userlvl: 0,
};

export default function user(
  state = initialState,
  action,
) {
  switch (action.type) {
    case 'COOLDOWN_SET': {
      const { coolDown } = action;
      return {
        ...state,
        coolDown: coolDown || null,
      };
    }

    case 'COOLDOWN_END': {
      return {
        ...state,
        coolDown: null,
        lastCoolDownEnd: Date.now(),
        wait: null,
      };
    }

    case 'REC_SET_PXLS': {
      const {
        wait: duration,
      } = action;
      return {
        ...state,
        wait: (duration) ? Date.now() + duration : state.wait,
      };
    }

    case 'REC_COOLDOWN': {
      const { wait: duration } = action;
      const wait = duration
        ? Date.now() + duration
        : null;
      return {
        ...state,
        wait,
        coolDown: null,
      };
    }

    case 'SET_MOBILE': {
      const { mobile: isOnMobile } = action;
      return {
        ...state,
        isOnMobile,
      };
    }

    case 's/REC_ME':
    case 's/LOGIN': {
      const {
        id,
        name,
        flag,
        createdAt,
        mailreg,
        blockDm,
        priv,
        userlvl,
      } = action;
      const messages = (action.messages) ? action.messages : [];
      return {
        ...state,
        id,
        name,
        flag,
        createdAt,
        messages,
        mailreg,
        blockDm,
        priv,
        userlvl,
      };
    }

    case 's/LOGOUT': {
      return {
        ...state,
        id: null,
        name: null,
        flag: null,
        createdAt: null,
        messages: [],
        mailreg: false,
        blockDm: false,
        priv: false,
        userlvl: 0,
      };
    }

    case 's/SET_NAME': {
      const { name } = action;
      return {
        ...state,
        name,
      };
    }

    case 's/SET_BLOCKING_DM': {
      const { blockDm } = action;
      return {
        ...state,
        blockDm,
      };
    }

    case 's/SET_PRIVATE': {
      const { priv } = action;
      return {
        ...state,
        priv,
      };
    }

    case 'SET_NOTIFICATION': {
      return {
        ...state,
        notification: action.notification,
      };
    }

    case 'UNSET_NOTIFICATION': {
      return {
        ...state,
        notification: null,
      };
    }

    case 's/REM_FROM_MESSAGES': {
      const { message } = action;
      const messages = [...state.messages];
      const index = messages.indexOf(message);
      if (index > -1) {
        messages.splice(index);
      }
      return {
        ...state,
        messages,
      };
    }

    case 's/SET_MAILREG': {
      const { mailreg } = action;
      return {
        ...state,
        mailreg,
      };
    }

    default:
      return state;
  }
}
