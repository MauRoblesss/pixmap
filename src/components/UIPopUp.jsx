/*
 * UI for single-window popUp
 */

import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { selectWindowType, selectWindowArgs } from '../store/selectors/popup';
import {
  setWindowArgs,
  setWindowTitle,
  changeWindowType,
} from '../store/actions/popup';
import WindowContext from './context/window';
import COMPONENTS from './windows';

const UIPopUp = () => {
  const windowType = useSelector(selectWindowType);
  const args = useSelector(selectWindowArgs);

  const [Content] = COMPONENTS[windowType];

  const dispatch = useDispatch();

  const contextData = useMemo(() => ({
    args,
    setArgs: (newArgs) => dispatch(setWindowArgs(newArgs)),
    setTitle: (title) => dispatch(setWindowTitle(title)),
    // eslint-disable-next-line max-len
    changeType: (newType, newTitle, newArgs) => dispatch(changeWindowType(newType, newTitle, newArgs)),
  }), [args]);

  return (
    <div
      className="popup-content"
    >
      <WindowContext.Provider value={contextData}>
        {(windowType)
          ? <Content />
          : <h1>Loading</h1>}
      </WindowContext.Provider>
    </div>
  );
};

export default React.memo(UIPopUp);
