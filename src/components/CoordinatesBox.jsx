/**
 *
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { t } from 'ttag';

import copy from '../utils/clipboard';
import { notify } from '../store/actions/thunks';


function renderCoordinates(cell) {
  return `(${cell.join(', ')})`;
}


const CoordinatesBox = () => {
  const view = useSelector((state) => state.canvas.view);
  const hover = useSelector((state) => state.canvas.hover);
  const dispatch = useDispatch();

  return (
    <div
      className="coorbox"
      onClick={() => {
        copy(window.location.hash);
        dispatch(notify(t`Copied!`));
      }}
      role="button"
      title={t`Copy to Clipboard`}
      tabIndex="0"
    >{
      renderCoordinates(hover
      || view.map(Math.round))
    }</div>
  );
};

export default React.memo(CoordinatesBox);
