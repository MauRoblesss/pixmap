/*
 * mouse dragging
 */

/* eslint-disable consistent-return */

import { useEffect, useCallback } from 'react';

/*
 * @param elRef element reference from useRef
 * @param startHandler function called on start of drag
 * @param diffHandler function that is called with dragged distance
 */
function useDrag(elRef, startHandler, diffHandler) {
  const startDrag = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (startHandler) startHandler();

    let {
      clientX: startX,
      clientY: startY,
    } = event.touches ? event.touches[0] : event;
    const drag = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const {
        clientX: curX,
        clientY: curY,
      } = evt.touches ? evt.touches[0] : evt;
      diffHandler(curX - startX, curY - startY);
      startX = curX;
      startY = curY;
    };
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    const stopDrag = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('touchmove', drag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchcancel', stopDrag);
      document.removeEventListener('touchend', stopDrag);
    };
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchcancel', stopDrag);
    document.addEventListener('touchend', stopDrag);
  }, [startHandler, diffHandler]);

  useEffect(() => {
    const refElem = elRef.current;

    if (!refElem) {
      return;
    }

    refElem.addEventListener('mousedown', startDrag, {
      passive: false,
    });
    refElem.addEventListener('touchstart', startDrag, {
      passive: false,
    });

    return () => {
      refElem.removeEventListener('mousedown', startDrag);
      refElem.removeEventListener('touchstart', startDrag);
    };
  }, [elRef, startDrag]);
}

export default useDrag;
