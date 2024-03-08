import React, { useState, useEffect } from 'react';

function getUserFromUrl(url) {
  let aPos = url.indexOf('/@');
  if (aPos === -1) {
    return url;
  }
  aPos += 1;
  let bPos = url.indexOf('/', aPos);
  if (bPos === -1) {
    bPos = url.length;
  }
  return url.substring(aPos, bPos);
}

const TikTok = ({ url }) => {
  const [embedCode, setEmbedCode] = useState(null);

  useEffect(() => {
    async function fetchData() {
      // eslint-disable-next-line max-len
      const tkurl = `${window.location.protocol}//www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const resp = await fetch(tkurl);
      const embedData = await resp.json();
      if (embedData.html) {
        setEmbedCode(embedData.html);
      }
    }
    fetchData();
  }, []);

  if (!embedCode) {
    return <div>LOADING</div>;
  }

  return (
    <iframe
      style={{
        width: '100%',
        height: 756,
      }}
      srcDoc={embedCode}
      frameBorder="0"
      referrerPolicy="no-referrer"
      allow="autoplay; picture-in-picture"
      scrolling="no"
      // eslint-disable-next-line max-len
      sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin allow-presentation"
      allowFullScreen
      title="Embedded tiktok"
    />
  );
};

export default [
  React.memo(TikTok),
  (url) => url.includes('/video/'),
  (url) => getUserFromUrl(url),
  '/embico/tiktok.png',
];
