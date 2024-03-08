/*
 * worker thread for creating captchas
 */

/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import ppfunCaptcha from 'ppfun-captcha';
import { isMainThread, parentPort } from 'worker_threads';

import { getRandomString } from '../core/utils';

const FONT_FOLDER = 'captchaFonts';

if (isMainThread) {
  throw new Error(
    'Tilewriter is run as a worker thread, not as own process',
  );
}

const font = fs.readdirSync(path.resolve(__dirname, '..', FONT_FOLDER))
  .filter((e) => e.endsWith('.ttf'))
  .map((e) => ppfunCaptcha.loadFont(
    path.resolve(__dirname, '..', FONT_FOLDER, e),
  ));

function createCaptcha() {
  return ppfunCaptcha.create({
    width: 500,
    height: 300,
    fontSize: 180,
    stroke: 'black',
    fill: 'none',
    nodeDeviation: 2.5,
    connectionPathDeviation: 10.0,
    style: 'stroke-width: 4;',
    background: '#EFEFEF',
    font,
  });
}

parentPort.on('message', (msg) => {
  try {
    if (msg === 'createCaptcha') {
      const captcha = createCaptcha();
      const captchaid = getRandomString();
      parentPort.postMessage([
        null,
        captcha.text,
        captcha.data,
        captchaid,
      ]);
    }
  } catch (error) {
    console.warn(
      // eslint-disable-next-line max-len
      `Captchas: Error on createCaptcha: ${error.message}`,
    );
    parentPort.postMessage(['Failure!']);
  }
});
