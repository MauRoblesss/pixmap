/*
 * draw windows
 */

import React from 'react';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';

import Window from './Window';
import Overlay from './Overlay';
import {
  closeFullscreenWindows,
} from '../store/actions/windows';
import {
  selectIfFullscreen,
  selectActiveWindowIds,
} from '../store/selectors/windows';

const WindowManager = () => {
  const windowIds = useSelector(selectActiveWindowIds, shallowEqual);
  const [
    fullscreenExistOrShowWindows,
    someOpenFullscreen,
  ] = useSelector(selectIfFullscreen, shallowEqual);
  const dispatch = useDispatch();

  if (!fullscreenExistOrShowWindows || !windowIds.length) {
    return null;
  }

  return (
    <div id="wm">
      <Overlay
        show={someOpenFullscreen}
        onClick={() => dispatch(closeFullscreenWindows())}
      />
      {windowIds.map((id) => <Window key={id} id={id} />)}
    </div>
  );
};

export default WindowManager;
