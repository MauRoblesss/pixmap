/**
 *
 * Button to open/close palette
 */

import React from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { MdPalette } from 'react-icons/md';
import { t } from 'ttag';

import { toggleOpenPalette } from '../../store/actions';

const PalselButton = () => {
  const paletteOpen = useSelector((state) => state.gui.paletteOpen);
  const [palette, selectedColor] = useSelector((state) => [
    state.canvas.palette,
    state.canvas.selectedColor,
  ], shallowEqual);
  const dispatch = useDispatch();

  return (
    <div
      id="palselbutton"
      className={`actionbuttons ${(paletteOpen) ? '' : 'pressed'}`}
      style={{
        color: palette.isDark(selectedColor) ? 'white' : 'black',
        backgroundColor: palette.colors[selectedColor],
      }}
      role="button"
      title={(paletteOpen) ? t`Close Palette` : t`Open Palette`}
      tabIndex={0}
      onClick={() => dispatch(toggleOpenPalette())}
    >
      <MdPalette />
    </div>
  );
};

export default React.memo(PalselButton);
