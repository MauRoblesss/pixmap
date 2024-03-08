/* eslint-disable jsx-a11y/media-has-caption */

import React from 'react';

const Matrix = ({ url }) => {
  const cleanUrl = url.substring(0, url.indexOf('?type='));
  if (url.includes('?type=video')) {
    return (
      <div className="vemb">
        <video
          className="vembc"
          controls
          autoPlay
          src={cleanUrl}
        />
      </div>
    );
  }
  return (
    <img
      alt={`Matrix ${cleanUrl}`}
      src={cleanUrl}
      style={{ maxWidth: '100%' }}
    />
  );
};

export default [
  React.memo(Matrix),
  (url) => url.includes('?type=video') || url.includes('?type=image'),
  null,
  '/embico/matrix.png',
];
