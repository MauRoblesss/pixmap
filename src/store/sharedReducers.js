/*
 * reducers that are shared between pages
 */

/* eslint-disable no-console */

import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import gui from './reducers/gui';
import ranks from './reducers/ranks';
import chatRead from './reducers/chatRead';
import user from './reducers/user';
import canvas from './reducers/canvas';
import chat from './reducers/chat';
import fetching from './reducers/fetching';

export const CURRENT_VERSION = 15;

export const migrate = (state, version) => {
  // eslint-disable-next-line no-underscore-dangle
  if (!state || !state._persist || state._persist.version !== version) {
    console.log('Newer version run, resetting store.');
    return Promise.resolve({});
  }
  console.log(`Store version: ${version}`);
  return Promise.resolve(state);
};

const guiPersist = persistReducer({
  key: 'gui',
  storage,
  version: CURRENT_VERSION,
  migrate,
}, gui);

const ranksPersist = persistReducer({
  key: 'ranks',
  storage,
  version: CURRENT_VERSION,
  migrate,
}, ranks);

const chatReadPersist = persistReducer({
  key: 'cr',
  storage,
  version: CURRENT_VERSION,
  migrate,
}, chatRead);

export default {
  gui: guiPersist,
  ranks: ranksPersist,
  chatRead: chatReadPersist,
  user,
  canvas,
  chat,
  fetching,
};
