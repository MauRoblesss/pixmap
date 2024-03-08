/*
 * Parse Mention of Username
 */
import React from 'react';

import { colorFromText, setBrightness } from '../../src/core/utils';

const dark = false;
const ownid = 1;

const MdMention = ({ name, uid }) => {
  const id = uid && uid.trim();

  return (
    <span
      className={(id == ownid) ? "ping" : "mention"}
      style={{
        color: setBrightness(colorFromText(name), dark),
      }}
    >{name}</span>
  );
}

export default React.memo(MdMention);
