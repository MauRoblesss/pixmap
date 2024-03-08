import React, { useRef } from 'react';
import ReactDOM from 'react-dom';

import UserContextMenu from './UserContextMenu';
import ChannelContextMenu from './ChannelContextMenu';
import {
  useClickOutside,
} from '../hooks/clickOutside';
import EmojiContextMenu from './EmojiContextMenu';

export const types = {
  USER: UserContextMenu,
  CHANNEL: ChannelContextMenu,
  EMOJI: EmojiContextMenu,
};

const ContextMenu = ({
  type, x, y, args, close, align,
}) => {
  const wrapperRef = useRef(null);

  useClickOutside([wrapperRef], close);

  if (!type) {
    return null;
  }

  const style = {};
  switch (align) {
    case 'tr': {
      style.right = window.innerWidth - x;
      style.top = y;
      break;
    }
    case 'br': {
      style.right = window.innerWidth - x;
      style.bottom = window.innerHeight - y;
      break;
    }
    case 'bl': {
      style.left = x;
      style.bottom = window.innerHeight - y;
      break;
    }
    default: {
      // also 'tl'
      style.left = x;
      style.top = y;
    }
  }

  const Content = types[type];

  return ReactDOM.createPortal((
    <div
      ref={wrapperRef}
      className={`contextmenu ${type}`}
      style={style}
    >
      <Content close={close} args={args} />
    </div>
  ), document.getElementById('app'));
};

export default React.memo(ContextMenu);
