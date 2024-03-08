/*
 * Minify CSS
 * currently just css files for themes are loades seperately,
 * so files beginning with "theme-" in the src/styles folder will
 * be read and automatically added.
 *
 */

/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const crypto = require('crypto');

const buildTs = Date.now();
const assetdir = path.resolve(__dirname, '..', 'dist', 'public', 'assets');
const builddir = path.resolve(__dirname, '..', 'dist');

const FOLDER = path.resolve(__dirname, '..', 'src', 'styles');
const FILES = fs.readdirSync(FOLDER).filter((e) => e.startsWith('theme-'));
FILES.push('default.css');

async function minifyCss() {
  console.log('Minifying css');
  FILES.forEach((file) => {
    const input = fs.readFileSync(path.resolve(FOLDER, file), 'utf8');
    const options = {};
    const output = new CleanCSS(options).minify(input);
    if (output.warnings && output.warnings.length > 0) {
      for (let i = 0; i < output.warnings.length; i += 1) {
        console.log('\x1b[33m%s\x1b[0m', output.warnings[i]);
      }
    }
    if (output.errors && output.errors.length > 0) {
      for (let i = 0; i < output.errors.length; i += 1) {
        console.log('\x1b[31m%s\x1b[0m', output.errors[i]);
      }
      throw new Error('Minify CSS Error Occured');
    }
    // eslint-disable-next-line max-len
    console.log('\x1b[33m%s\x1b[0m', `Minified ${file} by ${Math.round(output.stats.efficiency * 100)}%`);
    const hash = crypto.createHash('md5').update(output.styles).digest('hex');
    let key = file.substr(0, file.indexOf('.'));
    if (key.startsWith('theme-')) {
      key = key.substr(6);
    }
    const filename = `${key}.${hash.substr(0, 8)}.css`;
    fs.writeFileSync(path.resolve(assetdir, filename), output.styles, 'utf8');
  });
}

async function doMinifyCss() {
  try {
    fs.mkdirSync(assetdir, { recursive: true });
    await minifyCss();
  } catch (e) {
    console.log('ERROR while minifying css', e);
    process.exit(1);
  }
  process.exit(0); 
}

if (require.main === module) {
  doMinifyCss();
}

module.exports = minifyCss;
