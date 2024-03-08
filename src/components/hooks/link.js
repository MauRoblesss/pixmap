/*
 * function to link to window
 */

import { useCallback, useContext } from 'react';
import { useDispatch } from 'react-redux';

import { isPopUp, buildPopUpUrl } from '../windows/popUpAvailable';
import { openWindow } from '../../store/actions/windows';
import WindowContext from '../context/window';

function openPopUp(url, xPos, yPos, width, height) {
  let left;
  let top;
  try {
    if (window.innerWidth <= 604) {
      width = window.innerWidth;
      height = window.innerHeight;
      left = window.top.screenX;
      top = window.top.screenY;
    } else {
      left = Math.round(window.top.screenX + xPos);
      top = Math.round(window.top.screenY + yPos);
    }
    if (Number.isNaN(left) || Number.isNaN(top)) {
      throw new Error('NaN');
    }
  } catch {
    left = 0;
    top = 0;
  }
  try {
    return window.open(
      url,
      url,
      // eslint-disable-next-line max-len
      `popup=yes,width=${width},height=${height},left=${left},top=${top},toolbar=no,status=no,directories=no,menubar=no`,
    );
  } catch {
    return null;
  }
}

export function openWindowPopUp(windowType, args, xPos, yPos, width, height) {
  openPopUp(buildPopUpUrl(windowType, args), xPos, yPos, width, height);
}

function useLink() {
  const dispatch = useDispatch();

  const contextData = useContext(WindowContext);

  return useCallback((windowType, options = {}) => {
    const {
      xPos = null,
      yPos = null,
      width = null,
      height = null,
      args = null,
    } = options;

    if (options.target === 'popup') {
      // open as popup
      openWindowPopUp(
        windowType,
        args,
        xPos,
        yPos,
        width,
        height,
      );
      return;
    }

    const {
      title = '',
    } = options;

    const isMain = !isPopUp();

    if (options.target === 'blank' && isMain) {
      // open as new window
      const {
        cloneable = true,
      } = options;

      dispatch(openWindow(
        windowType.toUpperCase(),
        title,
        args,
        false,
        cloneable,
        xPos,
        yPos,
        width,
        height,
      ));
      return;
    }

    if (options.target === 'fullscreen' && isMain) {
      // open as fullscreen modal
      const {
        cloneable = true,
      } = options;

      dispatch(openWindow(
        windowType.toUpperCase(),
        title,
        args,
        true,
        cloneable,
        xPos,
        yPos,
        width,
        height,
      ));
      return;
    }

    if (!contextData) {
      // open within browser window
      window.location.href = buildPopUpUrl(windowType, args);
      return;
    }

    // open within window
    contextData.changeType(windowType, title, args);
  }, [contextData]);
}

export default useLink;
