const initialState = {
  open: false,
  alertType: null,
  title: null,
  message: null,
  btn: null,
};

export default function alert(
  state = initialState,
  action,
) {
  switch (action.type) {
    case 'ALERT': {
      const {
        title, message, alertType, btn,
      } = action;

      return {
        ...state,
        open: true,
        title,
        message,
        alertType,
        btn,
      };
    }

    case 'CLOSE_ALERT': {
      return {
        ...state,
        open: false,
      };
    }

    default:
      return state;
  }
}
