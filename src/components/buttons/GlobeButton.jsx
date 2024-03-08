/**
 *
 */

import React from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { Md3DRotation } from 'react-icons/md';
import { t } from 'ttag';


/**
 * https://jsfiddle.net/AbdiasSoftware/7PRNN/
 */
function globe(canvasId, canvasIdent, canvasSize, view) {
  const [x, y] = view.map(Math.round);
  // eslint-disable-next-line max-len
  window.location.href = `globe#${canvasIdent},${canvasId},${canvasSize},${x},${y}`;
}


const GlobeButton = () => {
  const [canvasId, canvasIdent, canvasSize, view] = useSelector((state) => [
    state.canvas.canvasId,
    state.canvas.canvasIdent,
    state.canvas.canvasSize,
    state.canvas.view,
  ], shallowEqual);

  return (
    <div
      role="button"
      tabIndex={-1}
      id="globebutton"
      title={t`Globe View`}
      className="actionbuttons"
      onClick={() => globe(canvasId, canvasIdent, canvasSize, view)}
    >
      <Md3DRotation />
    </div>
  );
};

export default React.memo(GlobeButton);
