import React from 'react';

function getIdFromURL(url) {
  let vPos = -1;
  if (url.includes('youtube')) {
    vPos = url.indexOf('v=');
  }
  if (url.includes('youtu.be')) {
    vPos = url.indexOf('e/');
  }
  if (vPos === -1) {
    return null;
  }
  vPos += 2;
  let vEnd;
  for (vEnd = vPos;
    vEnd < url.length && !['&', '?', '/'].includes(url[vEnd]);
    vEnd += 1);
  return url.substring(vPos, vEnd);
}

const YouTube = ({ url }) => {
  const id = getIdFromURL(url);
  if (!id) {
    return null;
  }
  return (
    <div className="vemb" style={{ paddingBottom: '56.25%' }}>
      <iframe
        className="vembc"
        src={`https://www.youtube.com/embed/${id}`}
        frameBorder="0"
        referrerPolicy="no-referrer"
        allow="autoplay; picture-in-picture"
        // eslint-disable-next-line max-len
        sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin allow-presentation"
        allowFullScreen
        title="Embedded youtube"
      />
    </div>
  );
};

export default [
  React.memo(YouTube),
  getIdFromURL,
  (url) => getIdFromURL(url),
  '/embico/youtube.png',
];
