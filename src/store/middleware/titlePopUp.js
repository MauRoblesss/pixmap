/*
 * set URL and queries in popup window
 */
import { buildPopUpUrl } from '../../components/windows/popUpAvailable';

function setFullTitle(windowType, title) {
  const name = windowType[0] + windowType.substring(1).toLowerCase();
  document.title = (title) ? `${name} - ${title}` : name;
}

export default (store) => (next) => (action) => {
  const ret = next(action);

  switch (action.type) {
    case 'SET_WIN_TITLE': {
      const { windowType, title } = store.getState().popup;
      setFullTitle(windowType, title);
      break;
    }

    case 'CHANGE_WIN_TYPE':
    case 'SET_WIN_ARGS': {
      const {
        args,
        windowType,
        title,
      } = store.getState().popup;
      const url = buildPopUpUrl(windowType, args);
      window.history.pushState({}, undefined, url);
      setFullTitle(windowType, title);
      break;
    }

    default:
      // nothing
  }

  return ret;
};
