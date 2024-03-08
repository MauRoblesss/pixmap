/*
 * Main Script for windows (pop-ups and stuff)
 */

import { persistStore } from 'redux-persist';

import { parentExists } from './core/utils';
import store from './store/storePopUp';
import {
  urlChange,
} from './store/actions';
import {
  fetchMe,
} from './store/actions/thunks';
import SocketClient from './socket/SocketClient';
import renderAppPopUp from './components/AppPopUp';

persistStore(store, {}, () => {
  window.addEventListener('message', store.dispatch);

  store.dispatch({ type: 'HYDRATED' });

  window.addEventListener('popstate', () => {
    store.dispatch(urlChange());
  });

  if (!parentExists()) {
    store.dispatch(fetchMe());
    SocketClient.initialize(store);
  }
});

(function load() {
  const onLoad = () => {
    renderAppPopUp(document.getElementById('app'), store);
    document.removeEventListener('DOMContentLoaded', onLoad);
  };
  document.addEventListener('DOMContentLoaded', onLoad, false);
}());
