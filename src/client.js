/*
 * Entrypoint for main client script
 */

import { persistStore } from 'redux-persist';

import createKeyPressHandler from './controls/keypress';
import {
  initTimer,
  urlChange,
  setMobile,
  windowResize,
} from './store/actions';
import {
  fetchMe,
} from './store/actions/thunks';
import pixelTransferController from './ui/PixelTransferController';
import store from './store/store';
import renderApp from './components/App';
import { initRenderer, getRenderer } from './ui/rendererFactory';
import socketClient from './socket/SocketClient';
import { GC_INTERVAL } from './core/constants';

persistStore(store, {}, () => {
  window.addEventListener('message', store.dispatch);

  store.dispatch({ type: 'HYDRATED' });

  initRenderer(store, false);

  pixelTransferController.initialize(store, socketClient, getRenderer);

  window.addEventListener('hashchange', () => {
    store.dispatch(urlChange());
  });

  // check if on mobile
  function checkMobile() {
    store.dispatch(setMobile(true));
  }
  document.addEventListener('touchstart', checkMobile, { once: true });

  // listen for resize
  function onWindowResize() {
    store.dispatch(windowResize());
  }
  window.addEventListener('resize', onWindowResize);
  onWindowResize();

  store.dispatch(initTimer());

  store.dispatch(fetchMe());

  socketClient.initialize(store, pixelTransferController, getRenderer);
});

(function load() {
  const onLoad = () => {
    window.name = 'main';
    renderApp(document.getElementById('app'), store);

    const onKeyPress = createKeyPressHandler(store);
    document.addEventListener('keydown', onKeyPress, false);

    // garbage collection
    setInterval(() => {
      const renderer = getRenderer();
      renderer.gc();
    }, GC_INTERVAL);

    document.removeEventListener('DOMContentLoaded', onLoad);
  };
  document.addEventListener('DOMContentLoaded', onLoad, false);
}());
