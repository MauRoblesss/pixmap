/*
 * redux store for popups
 */

/* eslint-disable no-console */

import {
  applyMiddleware, createStore, combineReducers,
} from 'redux';
import thunk from 'redux-thunk';

/*
 * reducers
 */
import sharedReducers from './sharedReducers';
import popup from './reducers/popup';

/*
 * middleware
 */
import parent from './middleware/parent';
import socketClientHook from './middleware/socketClientHookPopUp';
import title from './middleware/titlePopUp';

const reducers = combineReducers({
  ...sharedReducers,
  popup,
});

const store = createStore(
  reducers,
  applyMiddleware(
    thunk,
    parent,
    socketClientHook,
    title,
  ),
);

/*
 * persistStore of redux-persist is called in popup.js
 */

export default store;
