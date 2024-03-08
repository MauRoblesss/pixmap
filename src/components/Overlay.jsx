/*
 * Overlay to fade out background
 */

import React, { useState, useEffect } from 'react';

const Overlay = ({ show, onClick, z }) => {
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (show) {
      window.setTimeout(() => {
        setRender(true);
      }, 10);
    }
  }, [show]);

  if (!render && !show) {
    return null;
  }

  return (
    <div
      className={(show && render)
        ? 'overlay show'
        : 'overlay'}
      style={(z) ? { zIndex: z } : {}}
      onTransitionEnd={() => {
        if (!show) setRender(false);
      }}
      tabIndex={-1}
      onClick={onClick}
    />
  );
};

export default React.memo(Overlay);
