/*
 * Provide css and js asset files for client
 */

import fs from 'fs';
import path from 'path';

import assetWatcher from './fsWatcher';
import { ASSET_DIR } from './config';

const assetDir = path.join(__dirname, 'public', ASSET_DIR);
/*
 * {
 *   js:
 *     client:
 *       en: "/assets/client.defult.134234.js",
 *       de: "/assets/client.de.32834234.js",
 *       [...]
 *     [...]
 *   css:
 *     default: "/assets/default.234234.css",
 *     dark-round: "/assets/dark-round.234233324.css",
 *     [...]
 * }
 */
let assets;

/*
 * check files in asset folder and write insto assets object
 */
function checkAssets() {
  const parsedAssets = {
    js: {},
    css: {},
  };
  const assetFiles = fs.readdirSync(assetDir);
  const mtimes = {};

  for (const filename of assetFiles) {
    const parts = filename.split('.');

    // File needs to have a timestamp in its name
    if (parts.length < 3) {
      continue;
    }
    // if multiple candidates exist, take most recent created file
    const mtime = fs.statSync(path.resolve(assetDir, filename))
      .mtime.getTime();
    const ident = parts.filter((a, ind) => ind !== parts.length - 2).join('.');
    if (mtimes[ident] && mtimes[ident] > mtime) {
      continue;
    }
    mtimes[ident] = mtime;

    const ext = parts[parts.length - 1];
    const relPath = `${ASSET_DIR}/${filename}`;

    switch (ext.toLowerCase()) {
      case 'js': {
        // Format: name.[lang].[timestamp].js
        if (parts.length === 4) {
          const [name, lang] = parts;
          let nameObj = parsedAssets.js[name];
          if (typeof nameObj !== 'object') {
            nameObj = {};
            parsedAssets.js[name] = nameObj;
          }
          nameObj[lang] = relPath;
        } else {
          const [name] = parts;
          parsedAssets.js[name] = relPath;
        }
        break;
      }
      case 'css': {
        // Format: [dark-]name.[timestamp].js
        parsedAssets.css[parts[0]] = relPath;
        break;
      }
      default:
        // nothing
    }
  }
  return parsedAssets;
}

assets = checkAssets();
// reload on asset change
assetWatcher.onChange(() => {
  assets = checkAssets();
});

export function getLangsOfJsAsset(name) {
  const nameAssets = assets.js[name];
  if (!nameAssets) {
    return [];
  }
  return Object.keys(nameAssets);
}

export function getJsAssets(name, lang) {
  const jsAssets = [];

  switch (name) {
    case 'client':
      jsAssets.push(assets.js.vendor);
      break;
    case 'globe':
      jsAssets.push(assets.js.three);
      break;
    default:
      // nothing
  }

  const nameAssets = assets.js[name];
  let mainAsset;
  if (typeof nameAssets === 'object') {
    mainAsset = (lang && nameAssets[lang])
      || nameAssets.en
      || Object.values(nameAssets)[0];
  } else {
    mainAsset = nameAssets;
  }
  if (mainAsset) {
    jsAssets.push(mainAsset);
  }

  return jsAssets;
}

export function getCssAssets() {
  return assets.css;
}
