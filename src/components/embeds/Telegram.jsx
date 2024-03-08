import React, { useState, useRef } from 'react';

import { stripQuery } from '../../core/utils';
import usePostMessage from '../hooks/postMessage';

const urlStr = 't.me/';

const Telegram = ({ url }) => {
  const [frameHeight, setFrameHeight] = useState(200);
  const iFrameRef = useRef(null);

  usePostMessage(iFrameRef,
    (data) => {
      try {
        const pdata = JSON.parse(data);
        if (pdata.event === 'resize') {
          if (pdata.height) {
            setFrameHeight(pdata.height);
          }
        }
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Could not read postMessage from frame: ${data}`);
      }
    },
  );

  let userPost = stripQuery(url);
  userPost = userPost.substring(userPost.indexOf(urlStr) + urlStr.length);
  const sslash = userPost.indexOf('/', userPost.indexOf('/') + 1);
  if (sslash !== -1) {
    userPost = userPost.substring(0, sslash);
  }

  return (
    <iframe
      ref={iFrameRef}
      style={{
        width: '100%',
        height: frameHeight,
      }}
      src={`https://t.me/${userPost}?embed=1`}
      frameBorder="0"
      referrerPolicy="no-referrer"
      allow="autoplay; picture-in-picture"
      scrolling="no"
      // eslint-disable-next-line max-len
      sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin allow-presentation"
      allowFullScreen
      title="Embedded telegram"
    />
  );
};

export default [
  React.memo(Telegram),
  (url) => {
    // https://t.me/name/34
    let statPos = url.indexOf(urlStr);
    if (statPos === -1 || statPos + urlStr.length + 1 >= url.length) {
      return false;
    }
    statPos = url.indexOf('/', statPos + urlStr.length + 1);
    if (statPos === -1 || statPos + 2 >= url.length) {
      return false;
    }
    return true;
  },
  (url) => {
    let title = url.substring(url.indexOf(urlStr) + urlStr.length);
    title = title.substring(0, title.indexOf('/'));
    return title;
  },
  '/embico/telegram.png',
];
