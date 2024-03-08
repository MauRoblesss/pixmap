/**
 *
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { t } from 'ttag';

import CanvasItem from '../CanvasItem';
import { selectCanvas } from '../../store/actions';
import useLink from '../hooks/link';


const CanvasSelect = () => {
  const [canvases, showHiddenCanvases, online] = useSelector((state) => [
    state.canvas.canvases,
    state.canvas.showHiddenCanvases,
    state.ranks.online,
  ], shallowEqual);
  const dispatch = useDispatch();
  const selCanvas = useCallback((canvasId) => dispatch(selectCanvas(canvasId)),
    [dispatch]);

  const link = useLink();

  return (
    <div className="content">
      <p>
        {t`Select the canvas you want to use. \
 Every canvas is unique and has different palettes, cooldown and requirements. \
 Archive of closed canvases can be accessed here:`}&nbsp;
        <span
          role="button"
          tabIndex={0}
          className="modallink"
          onClick={() => link('ARCHIVE')}
        >{t`Archive`}</span>)
      </p>
      {
          Object.keys(canvases).map((canvasId) => (
            (!canvases[canvasId].hid || showHiddenCanvases)
              && (
                <CanvasItem
                  key={canvasId}
                  online={online[canvasId]}
                  canvasId={canvasId}
                  canvas={canvases[canvasId]}
                  selCanvas={selCanvas}
                />
              )
          ))
        }
    </div>
  );
};

export default React.memo(CanvasSelect);
