/*
 *
 */

import React from 'react';
import { useSelector } from 'react-redux';

function Style() {
  let style = useSelector((state) => state.gui.style);
  if (!window.ssv.availableStyles) {
    return null;
  }

  // style for special occasions
  const curDate = new Date();
  const month = curDate.getMonth() + 1;
  const day = curDate.getDate();
  if ((day === 31 && month === 10) || (day === 1 && month === 11)) {
    // halloween
    style = 'dark-spooky';
  }

  const cssUri = window.ssv.availableStyles[style];

  return (style === 'default' || !cssUri) ? null
    : (<link rel="stylesheet" type="text/css" href={cssUri} />);
}

export default React.memo(Style);
