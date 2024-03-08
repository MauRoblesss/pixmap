/**
 *
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';

import { selectColor } from '../store/actions';
import useWindowSize from './hooks/resize';


/*
 * defines the style of the palette
 * based on windowSize
 */
function getStylesByWindowSize(
  paletteOpen,
  windowSize,
  colors,
  clrHide,
  compactPalette,
) {
  const {
    width: windowWidth,
    height: windowHeight,
  } = windowSize;
  const numCal = colors.length - clrHide;

  let flexDirection;
  let spanSize;
  let paletteCols;
  if (windowWidth <= 300 || windowHeight <= 432) {
    // tiny compact palette
    spanSize = 24;
    paletteCols = 5;
    flexDirection = 'row';
  } else if (numCal > 30 || compactPalette) {
    // compact palette
    spanSize = 28;
    paletteCols = 5;
    flexDirection = 'row';
  } else {
    // ordinary palette (one or two columns)
    spanSize = 24;
    paletteCols = (windowHeight < 801) ? 2 : 1;
    flexDirection = 'column';
  }
  const height = Math.ceil(numCal / paletteCols) * spanSize;
  const width = spanSize * paletteCols;

  if (!paletteOpen) {
    return [{
      display: 'flex',
      flexWrap: 'wrap',
      textAlign: 'center',
      lineHeight: 0,
      height: 0,
      width,
      flexDirection,
      visibility: 'hidden',
    }, {
      display: 'block',
      height: 0,
      width: spanSize,
      margin: 0,
      padding: 0,
      visibility: 'hidden',
    }];
  }

  return [{
    display: 'flex',
    flexWrap: 'wrap',
    textAlign: 'center',
    lineHeight: 0,
    height,
    width,
    flexDirection,
    visibility: 'visible',
  }, {
    display: 'block',
    width: spanSize,
    height: spanSize,
    margin: 0,
    padding: 0,
    cursor: 'pointer',
    visibility: 'visible',
  }];
}

const Palette = () => {
  const [render, setRender] = useState(false);
  const [
    paletteOpen,
    compactPalette,
    colors,
    clrIgnore,
    selectedColor,
    userlvl,
  ] = useSelector((state) => [
    state.gui.paletteOpen,
    state.gui.compactPalette,
    state.canvas.palette.colors,
    state.canvas.clrIgnore,
    state.canvas.selectedColor,
    state.user.userlvl,
  ], shallowEqual);
  const dispatch = useDispatch();

  useEffect(() => {
    window.setTimeout(() => {
      if (paletteOpen) setRender(true);
    }, 10);
  }, [paletteOpen]);

  const onTransitionEnd = () => {
    if (!paletteOpen) setRender(false);
  };

  const clrHide = (userlvl === 0) ? clrIgnore : 0;

  const [paletteStyle, spanStyle] = getStylesByWindowSize(
    (render && paletteOpen),
    useWindowSize(),
    colors,
    clrHide,
    compactPalette,
  );

  return (
    (render || paletteOpen) && (
      <div
        id="palettebox"
        style={paletteStyle}
        onTransitionEnd={onTransitionEnd}
      >
        {colors.slice(clrHide).map((color, index) => (
          <span
            style={{
              backgroundColor: color,
              ...spanStyle,
            }}
            role="button"
            tabIndex={0}
            aria-label={`color ${index + clrHide}`}
            key={`${color}-${index + clrHide}`}
            className={selectedColor === (index + clrHide)
              ? 'selected'
              : 'unselected'}
            color={color}
            onClick={() => dispatch(selectColor(index + clrHide))}
          />
        ))}
      </div>
    )
  );
};

export default React.memo(Palette);
