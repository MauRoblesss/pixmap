/*
 * draw window
 */

import React, {
  useState, useCallback, useRef, useEffect, useMemo,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { BiChalkboard } from 'react-icons/bi';
import { t } from 'ttag';

import { openWindowPopUp } from './hooks/link';
import {
  moveWindow,
  removeWindow,
  resizeWindow,
  closeWindow,
  toggleMaximizeWindow,
  cloneWindow,
  focusWindow,
  setWindowTitle,
  setWindowArgs,
  changeWindowType,
} from '../store/actions/windows';
import {
  makeSelectWindowById,
  makeSelectWindowPosById,
  makeSelectWindowArgs,
  selectShowWindows,
} from '../store/selectors/windows';
import useDrag from './hooks/drag';
import WindowContext from './context/window';
import COMPONENTS from './windows';
import popUpTypes from './windows/popUpAvailable';

const Window = ({ id }) => {
  const [render, setRender] = useState(false);

  const titleBarRef = useRef();
  const resizeRef = useRef();

  const selectWindowById = useMemo(() => makeSelectWindowById(id), []);
  const selectWindowPosById = useMemo(() => makeSelectWindowPosById(id), []);
  const selectWindowArgs = useMemo(() => makeSelectWindowArgs(id), []);
  const win = useSelector(selectWindowById);
  const position = useSelector(selectWindowPosById);
  const showWindows = useSelector(selectShowWindows);
  const args = useSelector(selectWindowArgs);

  const dispatch = useDispatch();

  const contextData = useMemo(() => ({
    args,
    setArgs: (newArgs) => dispatch(setWindowArgs(id, newArgs)),
    setTitle: (title) => dispatch(setWindowTitle(id, title)),
    // eslint-disable-next-line max-len
    changeType: (newType, newTitle, newArgs) => dispatch(changeWindowType(id, newType, newTitle, newArgs)),
  }), [id, args]);

  const {
    open,
    hidden,
    fullscreen,
  } = win;

  const focus = useCallback(() => {
    dispatch(focusWindow(id));
  }, [dispatch]);

  const clone = useCallback((evt) => {
    evt.stopPropagation();
    dispatch(cloneWindow(id));
  }, [dispatch]);

  const toggleMaximize = useCallback(() => {
    setRender(false);
  }, [dispatch]);

  const close = useCallback((evt) => {
    evt.stopPropagation();
    dispatch(closeWindow(id));
  }, [dispatch]);

  const {
    xPos, yPos,
    width, height,
  } = position;

  useDrag(
    titleBarRef,
    focus,
    useCallback((xDiff, yDiff) => dispatch(
      moveWindow(id, xDiff, yDiff),
    ), [fullscreen, !render && hidden]),
  );

  useDrag(
    resizeRef,
    focus,
    useCallback((xDiff, yDiff) => dispatch(
      resizeWindow(id, xDiff, yDiff),
    ), [fullscreen, !render && hidden]),
  );

  const onTransitionEnd = useCallback(() => {
    if (hidden) {
      setRender(false);
    }
    if (!open) {
      dispatch(removeWindow(id));
      return;
    }
    if (!render && !hidden) {
      dispatch(toggleMaximizeWindow(id));
      setTimeout(() => setRender(true), 10);
    }
  }, [dispatch, hidden, open, render]);

  useEffect(() => {
    if (open && !hidden) {
      window.setTimeout(() => {
        setRender(true);
      }, 10);
    }
  }, [open, hidden]);

  if (!render && (hidden || !open)) {
    return null;
  }

  const { title, windowType } = win;
  const { z } = position;

  const [Content, name] = COMPONENTS[windowType];

  const windowTitle = (title) ? `${name} - ${title}` : name;
  const extraClasses = `${windowType}${
    (open && !hidden && render) ? ' show' : ''}`;

  if (fullscreen) {
    return (
      <div
        className={`modal ${extraClasses}`}
        onTransitionEnd={onTransitionEnd}
        onClick={focus}
        style={{
          zIndex: z,
        }}
      >
        <h2>{windowTitle}</h2>
        <div
          onClick={close}
          className="modal-topbtn close"
          role="button"
          label="close"
          key="closebtn"
          title={t`Close`}
          tabIndex={-1}
        >✕</div>
        {popUpTypes.includes(windowType) && (
          <div
            onClick={(evt) => {
              openWindowPopUp(
                windowType, args,
                xPos, yPos, width, height,
              );
              close(evt);
            }}
            className="modal-topbtn pop"
            role="button"
            label="close"
            key="popbtn"
            title={t`PopUp`}
            tabIndex={-1}
          ><BiChalkboard /></div>
        )}
        {(showWindows) && (
          <div
            onClick={toggleMaximize}
            className="modal-topbtn restore"
            key="resbtn"
            role="button"
            label="restore"
            title={t`Restore`}
            tabIndex={-1}
          >↓</div>
        )}
        <div
          className="modal-content"
          key="content"
        >
          <WindowContext.Provider value={contextData}>
            <Content />
          </WindowContext.Provider>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`window ${extraClasses}`}
      onTransitionEnd={onTransitionEnd}
      onClick={focus}
      style={{
        left: xPos,
        top: yPos,
        width,
        height,
        zIndex: z,
      }}
    >
      <div
        className="win-topbar"
        key="topbar"
      >
        <span
          className="win-topbtn"
          key="clonebtn"
          onClick={clone}
          title={t`Clone`}
        >
          +
        </span>
        <span
          className="win-title"
          key="title"
          ref={titleBarRef}
          title={t`Move`}
        >
          {windowTitle}
        </span>
        {popUpTypes.includes(windowType) && (
          <span
            className="win-topbtn"
            key="pobtnm"
            onClick={(evt) => {
              openWindowPopUp(
                windowType, args,
                xPos, yPos, width, height,
              );
              close(evt);
            }}
          >
            <BiChalkboard />
          </span>
        )}
        <span
          className="win-topbtn"
          key="maxbtn"
          onClick={toggleMaximize}
          title={t`Maximize`}
        >
          ↑
        </span>
        <span
          className="win-topbtn close"
          key="closebtn"
          onClick={close}
          title={t`Close`}
        >
          X
        </span>
      </div>
      <div
        className="win-resize"
        key="winres"
        title={t`Resize`}
        ref={resizeRef}
      >
        ▨
      </div>
      <div
        className="win-content"
        key="content"
      >
        <WindowContext.Provider value={contextData}>
          <Content />
        </WindowContext.Provider>
      </div>
    </div>
  );
};

export default React.memo(Window);
