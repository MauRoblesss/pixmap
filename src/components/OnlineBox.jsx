/**
 *
 */

import React from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { FaUser, FaPaintBrush, FaFlipboard } from 'react-icons/fa';
import { t } from 'ttag';

import { toggleOnlineCanvas } from '../store/actions';
import { numberToString } from '../core/utils';


const OnlineBox = () => {
  const [
    online,
    totalPixels,
    name,
    onlineCanvas,
    canvasId,
  ] = useSelector((state) => [
    state.ranks.online,
    state.ranks.totalPixels,
    state.user.name,
    state.gui.onlineCanvas,
    state.canvas.canvasId,
  ], shallowEqual);
  const dispatch = useDispatch();

  return (
    <div
      className="onlinebox"
      role="button"
      tabIndex="0"
      onClick={() => dispatch(toggleOnlineCanvas())}
    >
      {(onlineCanvas)
        ? (
          <span
            title={t`Online Users on Canvas`}
          >
            {online[canvasId] || 0}<FaUser /><FaFlipboard />
          </span>
        )
        : (
          <span
            title={t`Total Online Users`}
          >
            {online.total}<FaUser />
          </span>
        )}
       &nbsp;
      {(name != null)
          && (
          <span title={t`Pixels placed`}>
            {numberToString(totalPixels)} <FaPaintBrush />
          </span>
          )}
    </div>
  );
};

export default React.memo(OnlineBox);
