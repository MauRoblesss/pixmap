/*
 * Provide translation serverside
 */
import { TTag } from 'ttag';
import cookie from 'cookie';

import assetWatcher from './fsWatcher';
import { getLangsOfJsAsset } from './assets';

// eslint-disable-next-line max-len
const localeImports = require.context('../../i18n', false, /^\.[/\\]ssr-.+\.po$/);

const ttags = {};

export const availableLangs = [];

function loadTtags() {
  const langs = localeImports.keys();
  const jsLangs = getLangsOfJsAsset('client');
  availableLangs.length = 0;

  if (jsLangs.includes('en')) {
    if (!ttags.en) {
      ttags.en = new TTag();
    }
    availableLangs.push(['en', 'gb']);
  } else if (ttags.en) {
    delete ttags.en;
  }

  for (let i = 0; i < langs.length; i += 1) {
    const file = langs[i];
    // ./ssr-de.po
    let lang = file.replace('./ssr-', '').replace('.po', '').toLowerCase();
    let flag = lang;
    /*
     * in cases where the language code and country code differ,
     * the country code can be given seperately in the file name
     * i.e.: ./ssr-en-gb.po
     */
    const seperator = lang.indexOf('-');
    if (seperator !== -1) {
      [lang, flag] = lang.split('-');
    }
    if (jsLangs.includes(lang)) {
      if (!ttags[lang]) {
        const ttag = new TTag();
        ttag.addLocale(lang, localeImports(file).default);
        ttag.useLocale(lang);
        ttags[lang] = ttag;
      }
      availableLangs.push([lang, flag]);
    } else if (ttags[lang]) {
      delete ttags[lang];
    }
  }
}

loadTtags();
// reload on asset change
assetWatcher.onChange(() => {
  loadTtags();
});

export function getTTag(lang) {
  return ttags[lang] || ttags.en || Object.values(ttags)[0];
}

/*
 * gets preferred language out of localisation string
 * @param location string (like from accept-language header)
 * @return language code
 */
function languageFromLocalisation(localisation) {
  if (!localisation) {
    return 'en';
  }
  let lang = localisation;
  let i = lang.indexOf('-');
  if (i !== -1) {
    lang = lang.slice(0, i);
  }
  i = lang.indexOf(',');
  if (i !== -1) {
    lang = lang.slice(0, i);
  }
  i = lang.indexOf(';');
  if (i !== -1) {
    lang = lang.slice(0, i);
  }
  return lang.toLowerCase();
}

/*
 * express middleware for getting language
 * It checks the lang cookie, and if not present,
 * the Accept-Language header
 */
export function expressTTag(req, res, next) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const language = cookies.plang || req.headers['accept-language'];
  let lang = languageFromLocalisation(language);
  if (!ttags[lang]) {
    if (ttags.en) {
      lang = 'en';
    } else {
      [lang] = Object.keys(ttags);
    }
  }
  req.lang = lang;
  req.ttag = ttags[lang];
  next();
}

export default ttags;
