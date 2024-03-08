/*
 * We got so many locals that building them all in one go can lead to out-of-memory error
 * Lets split that here
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const webpack = require('webpack');

const minifyCss = require('./minifyCss');
const serverConfig = require('../webpack.config.server.js');
const clientConfig = require('../webpack.config.client.js');
const { getAllAvailableLocals } = clientConfig;

let langs = 'all';
let doBuildServer = false;
let doBuildClient = false;
let parallel = false;
let recursion = false;
for (let i = 0; i < process.argv.length; i += 1) {
  switch (process.argv[i]) {
    case '--langs': {
      const newLangs = process.argv[++i];
      if (newLangs) langs = newLangs;
      break;
    }
    case '--client':
      doBuildClient = true;
      break;
    case `--server`:
      doBuildServer = true;
      break;
    case '--parallel':
      parallel = true;
      break;
    case '--recursion':
      recursion = true;
      break;
    default:
      // nothing
  }
}
if (!doBuildServer && !doBuildClient) {
  doBuildServer = true;
  doBuildClient = true;
}

function compile(webpackConfig) {
  return new Promise((resolve, reject) => {
    webpack(webpackConfig, (err, stats) => {
      if (err) {
        return reject(err);
      }
      const statsConfig = (webpackConfig.length) ? webpackConfig[0].stats : webpackConfig.stats;
      console.log(stats.toString(statsConfig))
      return resolve();
    });
  });
}

function buildServer() {
  console.log('-----------------------------');
  console.log(`Build server...`);
  console.log('-----------------------------');
  const ts = Date.now();

  return new Promise((resolve, reject) => {
    const argsc = (langs === 'all')
      ? ['webpack', '--env', 'extract', '--config', './webpack.config.server.js']
      : ['webpack', '--config', './webpack.config.server.js']
    const serverCompile = spawn('npx', argsc);
    serverCompile.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    serverCompile.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    serverCompile.on('close', (code) => {
      if (code) {
        reject(new Error('Server compilation failed!'));
      } else {
        console.log('---------------------------------------');
        console.log(`Server Compilation finished in ${Math.floor((Date.now() - ts) / 1000)}s`);
        console.log('---------------------------------------');
        resolve();
      }
    });
  });
}

function buildClients(slangs) {
  return new Promise((resolve, reject) => {
    const clientCompile = spawn('npm', ['run', 'build', '--', '--client', '--recursion', '--langs', slangs.join(',')]);
    clientCompile.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    clientCompile.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    clientCompile.on('close', (code) => {
      if (code) {
        reject(new Error('Client compilation failed!'));
      } else {
        resolve();
      }
    });
  });
}

async function buildClientsSync(avlangs) {
  for(let i = 0; i < avlangs.length; i += 1) {
    const lang = avlangs[i];
    console.log(`Build client for locale ${lang}...`);
    await compile(clientConfig({
      development: false,
      analyze: false,
      extract: false,
      locale: lang,
      clean: false,
      readonly: recursion,
    }));
  }
}

function buildClientsParallel(avlangs) {
  const st = Date.now();
  const numProc = 3;
  let nump = Math.floor(avlangs.length / numProc);
  if (!nump) nump = 1;

  const promises = [];
  while (avlangs.length >= nump) {
    const slangs = avlangs.splice(0, nump);
    promises.push(buildClients(slangs));
  }
  if (avlangs.length) {
    promises.push(buildClientsSync(avlangs));
  }
  return Promise.all(promises);
}

async function buildProduction() {
  const st = Date.now();
  // cleanup old files
  if (!recursion) {
    fs.rmSync(path.resolve(__dirname, '..', 'node_modules', '.cache', 'webpack'), { recursive: true, force: true });
  }

  // decide which languages to build
  let avlangs = getAllAvailableLocals();
  if (langs !== 'all') {
    avlangs = langs.split(',').map((l) => l.trim())
      .filter((l) => avlangs.includes(l));
    if (!avlangs.length) {
      console.error(`ERROR: language ${langs} not available`);
      process.exit(1);
      return;
    }
  }
  console.log('Building locales:', avlangs);

  const promises = [];

  if (doBuildServer) {
    promises.push(buildServer());
  }

  if (doBuildClient) {
    if (!recursion) {
      console.log(
        'Building one package seperately to populate cache and possibly extract langs...',
      );
      await compile(clientConfig({
        development: false,
        analyze: false,
        extract: (langs === 'all'),
        locale: avlangs.shift(),
        clean: true,
        readonly: false,
      }));

      console.log('-----------------------------');
      console.log(`Minify CSS assets...`);
      console.log('-----------------------------');
      await minifyCss();
    }

    if (parallel) {
      promises.push(buildClientsParallel(avlangs));
    } else {
      promises.push(buildClientsSync(avlangs));
    }
  }
  await Promise.all(promises);

  if (!recursion) {
    console.log(`Finished building in ${(Date.now() - st) / 1000}s`);
  } else {
    console.log(`Worker done in ${(Date.now() - st) / 1000}s`);
  }
}

buildProduction();
