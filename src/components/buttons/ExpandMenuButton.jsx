/*
 * expand menu / show other menu buttons
 *
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';
import { t } from 'ttag';

import { toggleOpenMenu } from '../../store/actions';

const ExpandMenuButton = () => {
  const menuOpen = useSelector((state) => state.gui.menuOpen);
  const dispatch = useDispatch();

  return (
    <div
      id="menubutton"
      className="actionbuttons"
      role="button"
      title={(menuOpen) ? t`Close Menu` : t`Open Menu`}
      tabIndex={-1}
      onClick={() => dispatch(toggleOpenMenu())}
    >
      {(menuOpen) ? <MdExpandLess /> : <MdExpandMore /> }
    </div>
  );
};

export default React.memo(ExpandMenuButton);
