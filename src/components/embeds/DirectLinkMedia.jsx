/* eslint-disable jsx-a11y/media-has-caption */

import React from 'react';

import { getExt } from '../../core/utils';

const videoExts = [
  'webm',
  'mp4',
];
const imageExts = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
];

const DirectLinkMedia = ({ url }) => {
  const ext = getExt(url);
  if (videoExts.includes(ext)) {
    return (
      <div className="vemb">
        <video
          className="vembc"
          controls
          autoPlay
          src={url}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }
  return (
    <img
      alt={`Matrix ${url}`}
      src={url}
      style={{ maxWidth: '100%' }}
      referrerPolicy="no-referrer"
    />
  );
};

export default [
  React.memo(DirectLinkMedia),
  (url) => {
    const ext = getExt(url);
    return (videoExts.includes(ext) || imageExts.includes(ext));
  },
  null,
  '/embico/direct.png',
];
