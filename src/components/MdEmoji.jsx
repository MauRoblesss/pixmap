/*
 * Renders a emojis
 */

import React, { useState } from 'react';

const MdEmoji = ({ emoji }) => {

  return (
  <>
    <img
      className='emoji'
      style={{
        verticalAlign: 'middle',
      }}
      title={emoji}
      src={`/emojis/${emoji}.gif`}
    />
  </>
  );
};

export default React.memo(MdEmoji);
