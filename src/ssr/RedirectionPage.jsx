/*
 * Make basic redirection page
 */

/* eslint-disable max-len */

import { getTTag } from '../core/ttag';

function getHtml(description, text, host, lang) {
  const { jt, t } = getTTag(lang);

  const clickHere = `<a href="${host}">${t`Click here`}</a>`;

  const html = `
    <!doctype html>
    <html lang="${lang}">
      <head>
        <meta charset="UTF-8" />
        <title>${t`PixMap.fun Accounts`}</title>
        <meta name="description" content="${description}" />
        <meta name="google" content="nopagereadaloud" />
        <meta name="theme-color" content="#cae3ff" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="apple-touch-icon.png" />
        <script>window.setTimeout(function(){window.location.href="${host}";},15000)</script>
      </head>
      <body>
        <h3>${text}</h3>
        <p>${t`You will be automatically redirected after 15s`}</p>
        <p>${jt`Or ${clickHere} to go back to pixmap`}</p>
      </body>
    </html>
  `;

  return html;
}

export default getHtml;
