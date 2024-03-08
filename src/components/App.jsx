/**
 * Main App
 */

import React from 'react';
import { Provider } from 'react-redux';
import { createRoot } from 'react-dom/client';
import { IconContext } from 'react-icons';

import Style from './Style';
import CoordinatesBox from './CoordinatesBox';
import CanvasSwitchButton from './buttons/CanvasSwitchButton';
import OnlineBox from './OnlineBox';
import ChatButton from './buttons/ChatButton';
import Menu from './Menu';
import UI from './UI';
import ExpandMenuButton from './buttons/ExpandMenuButton';
import WindowManager from './WindowManager';
import PencilButton from './buttons/PencilButton';

const iconContextValue = { style: { verticalAlign: 'middle' } };

const App = () => (
  <>
    <Style />
    <IconContext.Provider value={iconContextValue}>
      <CanvasSwitchButton />
      <Menu />
      <ChatButton />
      <OnlineBox />
      <CoordinatesBox />
      <ExpandMenuButton />
      <PencilButton />
      <UI />
      <WindowManager />
    </IconContext.Provider>
  </>
);

function renderApp(domParent, store) {
  const root = createRoot(domParent);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
}

export default renderApp;
