/*
 * expand menu / show other menu buttons
 *
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { BsFillPencilFill, BsPencil } from "react-icons/bs";

import { t } from 'ttag';

import { togglePencilTool } from '../../store/actions';

const PencilButton = () => {
  const pencil = useSelector((state) => state.gui.pencilTool);
  const dispatch = useDispatch();

  let cN = 'actionbuttons'

  return (
    <div
      id="pencilbutton"
      className={(pencil) ? `${cN} pencilbuttonON` : `${cN}`}
      role="button"
      title={(pencil) ? t`Enable Pencil` : t`Disable Pencil`}
      tabIndex={-1}
      onClick={() => dispatch(togglePencilTool())}
    >
      {(pencil) ? <BsFillPencilFill /> : <BsPencil /> }
    </div>
  );
};

export default React.memo(PencilButton);
