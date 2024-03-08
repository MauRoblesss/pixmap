import React, { useState, useRef } from 'react';

import { stripQuery } from '../../core/utils';
import usePostMessage from '../hooks/postMessage';

const urlStr = '/status/';

const Twitter = ({ url }) => {
  const [frameHeight, setFrameHeight] = useState(200);
  const iFrameRef = useRef(null);

  usePostMessage(iFrameRef,
    (data) => {
      try {
        if (data['twttr.embed']
          && data['twttr.embed'].method === 'twttr.private.resize'
          && data['twttr.embed'].params.length
          && data['twttr.embed'].params[0].height
        ) {
          setFrameHeight(data['twttr.embed'].params[0].height);
        }
      } catch {
        // eslint-disable-next-line no-console
        console.error(`Could not read postMessage from frame: ${data}`);
      }
    },
  );


  let tid = stripQuery(url);
  tid = tid.substring(tid.indexOf(urlStr) + urlStr.length);
  if (tid.indexOf('/') !== -1) {
    tid = tid.substring(tid.indexOf('/'));
  }

  return (
    <iframe
      ref={iFrameRef}
      style={{
        width: '100%',
        height: frameHeight,
      }}
      src={
        // eslint-disable-next-line max-len
        `https://platform.twitter.com/embed/Tweet.html?dnt=true&embedId=twitter-widget-&frame=false&hideCard=false&hideThread=true&id=${tid}&theme=light&width=550px`
      }
      frameBorder="0"
      referrerPolicy="no-referrer"
      allow="autoplay; picture-in-picture"
      scrolling="no"
      // eslint-disable-next-line max-len
      // sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin allow-presentation"
      allowFullScreen
      title="Embedded twitter"
    />
  );
};

export default [
  React.memo(Twitter),
  (url) => {
    const statPos = url.indexOf(urlStr);
    if (statPos === -1 || statPos + urlStr.length + 1 >= url.length) {
      return false;
    }
    return true;
  },
  (url) => {
    let title = url.substring(0, url.indexOf(urlStr));
    title = title.substring(title.lastIndexOf('/') + 1);
    return title;
  },
  '/embico/twitter.png',
];
