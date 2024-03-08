/*
 * send and receive actions from parent window
 */

/* eslint-disable no-console */

import { parentExists } from '../../core/utils';
import { load, unload } from '../actions';

const { origin } = window.location;

window.addEventListener('beforeunload', () => {
  if (parentExists()) {
    window.opener.postMessage(unload(), origin);
  }
});


export default (store) => (next) => (action) => {
  if (action instanceof MessageEvent) {
    if (action.origin !== origin
      || !action.data.type
    ) {
      return null;
    }
    if (action.data.type === 't/UNLOAD') {
      setTimeout(() => {
        if (parentExists()) {
          console.log('Parent window refreshed');
          const parentReady = window.opener.document.readyState;
          if (parentReady !== 'complete'
            && parentReady !== 'loaded'
            && parentReady !== 'interactive'
          ) {
            // DOMContent no loaded yet
            const sendLoad = () => {
              window.opener.postMessage({ type: 't/LOAD' }, origin);
              window.opener.removeEventListener('DOMContentLoaded', sendLoad);
            };
            window.opener.addEventListener('DOMContentLoaded', sendLoad, false);
          }
          window.opener.postMessage({ type: 't/LOAD' }, origin);
        } else {
          console.log('Parent window closed');
          store.dispatch({ type: 't/PARENT_CLOSED' });
        }
      }, 3000);
    }
    return next(action.data);
  }

  if (window.opener && action.type) {
    try {
      if (action.type === 'HYDRATED') {
        window.opener.postMessage(load(), origin);
      } else if (action.type.startsWith('s/')) {
        window.opener.postMessage(action, origin);
      }
    } catch {
      // nothing
    }
  }

  return next(action);
};
