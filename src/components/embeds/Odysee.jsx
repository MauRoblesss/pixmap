/*
 * Odysee oembed API does not allow CORS request,
 * therefore we can't use it right now.
 * Still keeping this here in case that the policy changes in the future
 */
import React from 'react';

import { stripQuery } from '../../core/utils';

function stripCol(str) {
  const posCol = str.lastIndexOf(':');
  if (posCol !== -1) {
    return str.substring(0, posCol);
  }
  return str;
}

const urlStr = '/@';

const Odysee = ({ url }) => {
  let oid;
  let posA = url.indexOf(urlStr);
  if (posA !== -1) {
    oid = url.substring(url.indexOf('/', posA + urlStr.length) + 1);
  } else {
    posA = url.indexOf('//');
    if (posA === -1) {
      posA = 0;
    }
    oid = url.substring(url.indexOf('/', posA + 2) + 1);
  }
  oid = stripCol(stripQuery(oid));

  return (
    <div className="vemb" style={{ paddingBottom: '56.25%' }}>
      <iframe
        className="vembc"
        src={`https://odysee.com/$/embed/${oid}`}
        frameBorder="0"
        referrerPolicy="no-referrer"
        allow="autoplay; picture-in-picture"
        scrolling="no"
        // eslint-disable-next-line max-len
        sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin allow-presentation"
        allowFullScreen
        title="Embedded odysee"
      />
    </div>
  );
};

export default [
  React.memo(Odysee),
  (url) => {
    const urlPart = stripQuery(url);
    let posA = urlPart.indexOf(urlStr);
    if (posA !== -1) {
      // https://odysee.com/@lotuseaters_com:1/disney%E2%80%99s-%E2%80%9Cgay-agenda%E2%80%9D:1
      if (posA === -1 || posA + 4 >= urlPart.length) {
        return false;
      }
      posA = urlPart.indexOf('/', posA + urlStr.length);
      return !(posA === -1 || posA + 2 >= urlPart.length);
    }
    // https://odysee.com/why-we-were-wrong-about-ukraine:6bd300b38bf1b30fa56e53c191b0652682c2ae6f
    posA = urlPart.indexOf('//');
    if (posA === -1) {
      posA = 0;
    }
    posA = urlPart.indexOf('/', posA + 2);
    return !(posA === -1 || posA + 2 >= urlPart.length);
  },
  (url) => {
    let urlPart = stripQuery(url);
    let posA = urlPart.indexOf(urlStr);
    if (posA !== -1) {
      urlPart = urlPart.substring(posA + urlStr.length);
      let name = urlPart.substring(0, urlPart.indexOf('/'));
      urlPart = stripCol(urlPart.substring(name.length + 1));
      name = stripCol(name);
      return `${name} | ${urlPart}`;
    }
    posA = urlPart.indexOf('//');
    if (posA === -1) {
      posA = 0;
    }
    urlPart = urlPart.substring(urlPart.indexOf('/', posA + 2) + 1);
    urlPart = stripCol(stripQuery(urlPart));
    return urlPart;
  },
  '/embico/odysee.png',
];
