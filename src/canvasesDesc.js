/*
 * Create canvases.json with localized translated
 * descriptions.
 *
 */

import assetWatcher from './core/fsWatcher';
import canvases from './core/canvases';
import ttag from './core/ttag';


/* eslint-disable max-len */

function getCanvases(t) {
  /*
   * add descriptions and titles of canvases here
   * Use the t tag and right `backquotes`
   */
  const canvasTitles = {
    0: t`Earth`,
    1: t`Moon`,
    2: t`3D Canvas`,
    3: t`Coronavirus`,
    5: t`PixelZone`,
    6: t`PixelCanvas`,
    7: t`1bit`,
    8: t`Top10`,
    9: t`Thoia`,
    10: t`Mini Map`,
    11: t`Football`,
    12: t`Graffit`,
    13: t`Red vs Blue`,
    14: t`Pangea`,
    15: t`MiddleEarth`,
  };
  const canvasDesc = {
    0: t`Our main canvas, a huge map of the world. Place everywhere you like`,
    1: t`Moon canvas. Safe space for art. No flags or large text (unless part of art) or art larger than 1.5k x 1.5k pixels.`,
    2: t`Place Voxels on a 3D canvas with others`,
    3: t`Special canvas to spread awareness of SARS-CoV2`,
    5: t`Mirror of PixelZone`,
    6: t`Mirror of PixelCanvas`,
    7: t`Black and White canvas`,
    8: t`A canvas for the most active players from the the previous day. Daily ranking updates at 00:00 UTC.`,
    9: t`Thoia World Canvas. Advanced fictional worldbuilding and arts. Abandon the old world and all it entails.`,
    10: t`Map canvas but in a minimized version for those who want more fun!`,
    11: t`Football`,
    12: t`Graffit`,
    13: t`Chose teams and fight for them until end! `,
    14: t`Leave the world and enter into a old map, prehistoric building and factions.`,
    15: t`Join the battle between good and evil, men, elves, orcs, hobbits, dwarves, Error, Rohan, Angmar, Mordor! Come make your mark and build empires on Middle Earth! https://discord.com/invite/Mdp9Fyb8tm`,
  };
  /*
   * no edit below here needed when adding/removing canvas
   */

  const localizedCanvases = {};
  const canvasKeys = Object.keys(canvases);

  for (let i = 0; i < canvasKeys.length; i += 1) {
    const key = canvasKeys[i];
    localizedCanvases[key] = { ...canvases[key] };
    localizedCanvases[key].desc = canvasDesc[key]
      || canvases[key].desc
      || `Canvas ${key}`;
    localizedCanvases[key].title = canvasTitles[key]
      || canvases[key].title
      || `Canvas ${key}`;
  }

  return localizedCanvases;
}

function translateCanvases() {
  const parsedCanvases = {};
  const langs = Object.keys(ttag);
  langs.forEach((lang) => {
    parsedCanvases[lang] = getCanvases(ttag[lang].t);
  });
  return parsedCanvases;
}

let lCanvases = translateCanvases();
// reload on asset change
assetWatcher.onChange(() => {
  lCanvases = translateCanvases();
});

export default function getLocalizedCanvases(lang = 'en') {
  return lCanvases[lang] || lCanvases.en;
}
