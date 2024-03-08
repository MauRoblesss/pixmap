/*
 * Parse Mention of Username
 */
import React from 'react';
import { useSelector } from 'react-redux';

import { colorFromText, setBrightness } from '../core/utils';

const MdMention = ({ name, uid }) => {
  const id = uid && uid.trim();

  const isDarkMode = useSelector(
    (state) => state.gui.style.indexOf('dark') !== -1,
  );
  const ownId = useSelector((state) => state.user.id);

  return (
    <span
      className={
        // eslint-disable-next-line eqeqeq
        (id == ownId) ? 'ping' : 'mention'
      }
      style={{
        color: setBrightness(colorFromText(name), isDarkMode),
      }}
    >{`@${name}`}</span>
  );
};

export default React.memo(MdMention);
