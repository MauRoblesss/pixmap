/*
 * Make basic reset_password forms
 */

/* eslint-disable max-len */

import { getTTag } from '../core/ttag';

export default function getPasswordResetHtml(name, code, lang, message = null) {
  const { t } = getTTag(lang);

  let html;

  if (message) {
    html = `
      <!doctype html>
      <html lang="${lang}">
        <head>
          <meta charset="UTF-8" />
          <title>${t`PixMap.fun Password Reset`}</title>
          <meta name="description" content="${t`Reset your password here`}" />
          <meta name="google" content="nopagereadaloud" />
          <meta name="theme-color" content="#cae3ff" />
          <link rel="icon" href="/favicon.ico" type="image/x-icon" />
          <link rel="apple-touch-icon" href="apple-touch-icon.png" />
        </head>
        <body>
          <h3>${t`Reset Password`}</h3>
          <p>${message}</p>
          <p><a href="./">${t`Click here`}</a> ${t`to go back to pixmap`}</p>
        </body>
      </html>
    `;
  } else {
    html = `
      <!doctype html>
      <html lang="${lang}">
        <head>
          <meta charset="UTF-8" />
          <title>${t`PixMap.fun Password Reset`}</title>
          <meta name="description" content="${t`Reset your password here`}" />
          <meta name="google" content="nopagereadaloud" />
          <meta name="theme-color" content="#cae3ff" />
          <link rel="icon" href="/favicon.ico" type="image/x-icon" />
          <link rel="apple-touch-icon" href="apple-touch-icon.png" />
        </head>
        <body>
          <form method="post" action="reset_password">
            <h3>${t`Reset Password`}</h3>
            <p>${t`Hello ${name}, you can set your new password here:`}</p>
            <input
              type="password"
              name="pass"
              placeholder="${t`New Password`}"
              style="max-width:35em"
            />
            <input
              type="password"
              name="passconf"
              placeholder="${t`Confirm New Password`}"
              style="max-width:35em"
            />
            <input type="hidden" name="code" value=${code} />
            <input type="hidden" name="name" value=${name} />
            <button type="submit" name="submit">${t`Submit`}</button>
          </form>
        </body>
      </html>
    `;
  }

  return html;
}
