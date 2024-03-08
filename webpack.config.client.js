/**
 * webpack config for client files
 */

const fs = require('fs');
const path = require('path');
const process = require('process');
const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

/*
 * make sure we build in root dir
 */
process.chdir(__dirname);

module.exports = ({
  development,
  analyze,
  locale = 'en',
  extract,
  clean = true,
  readonly,
}) => {
  const ttag = {
    resolve: {
      translations: (locale !== 'en')
        ? path.resolve('i18n', `${locale}.po`)
        : 'default',
    },
  };

  if (extract) {
    ttag.extract = {
      output: path.resolve('i18n', 'template.pot'),
    };
  }

  const babelPlugins = [
    ['ttag', ttag],
  ];

  return {
    name: 'client',
    target: 'web',

    mode: (development) ? 'development' : 'production',
    devtool: (development) ? 'source-map' : false,

    entry: {
      client:
        [path.resolve('src', 'client.js')],
      globe:
        [path.resolve('src', 'globe.js')],
      popup:
        [path.resolve('src', 'popup.js')],
    },

    output: {
      path: path.resolve('dist', 'public', 'assets'),
      publicPath: '/assets/',
      // chunkReason is set if it is a split chunk like vendor or three
      filename: (pathData) => (pathData.chunk.chunkReason)
        ? '[name].[chunkhash:8].js'
        : `[name].${locale}.[chunkhash:8].js`,
      chunkFilename: `[name].${locale}.[chunkhash:8].js`,
      clean,
    },

    resolve: {
      alias: {
        /*
         * have to mock it, because we don't ship ttag itself with the client,
         * we have a script for every language
        */
        ttag: 'ttag/dist/mock',
        /*
         * if we don't do that,we might load different versions of three
         */
        three: path.resolve('node_modules', 'three'),
      },
      extensions: ['.js', '.jsx'],
    },

    module: {
      rules: [
        {
          test: /\.svg$/,
          use: [
            'babel-loader',
            {
              loader: 'react-svg-loader',
              options: {
                svgo: {
                  plugins: [
                    {
                      removeViewBox: false,
                    },
                    {
                      removeDimensions: true,
                    },
                  ],
                },
                jsx: false,
              },
            },
          ],
        },
        {
          test: /\.(js|jsx)$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                plugins: babelPlugins,
              },
            },
            path.resolve('scripts/TtagNonCacheableLoader.js'),
          ],
          include: [
            path.resolve('src'),
            ...['image-q'].map((moduleName) => (
              path.resolve('node_modules', moduleName)
            )),
          ],
        },
      ],
    },

    plugins: [
      // Define free variables
      // https://webpack.github.io/docs/list-of-plugins.html#defineplugin
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': development ? '"development"' : '"production"',
        'process.env.BROWSER': true,
      }),

      // Webpack Bundle Analyzer
      // https://github.com/th0r/webpack-bundle-analyzer
      ...analyze ? [new BundleAnalyzerPlugin({ analyzerPort: 8889 })] : [],
    ],

    optimization: {
      splitChunks: {
        chunks: 'all',
        name: false,
        cacheGroups: {
          default: false,
          defaultVendors: false,

          /*
           * this layout of chunks is also assumed in src/core/assets.js
           * client -> client.js + vendor.js
           * globe -> globe.js + three.js
           */
          vendor: {
            name: 'vendor',
            chunks: (chunk) => chunk.name.startsWith('client'),
            test: /[\\/]node_modules[\\/]/,
          },
          three: {
            name: 'three',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]three[\\/]/,
          },
        },
      },
    },

    recordsPath: path.resolve('records.json'),

    stats: {
      colors: true,
      reasons: false,
      hash: false,
      version: false,
      chunkModules: false,
    },

    cache: {
      type: 'filesystem',
      readonly,
    },
  };
}

function getAllAvailableLocals() {
  const langDir = path.resolve('i18n');
  const langs = fs.readdirSync(langDir)
    .filter((e) => (e.endsWith('.po') && !e.startsWith('ssr')))
    .map((l) => l.slice(0, -3));
  langs.unshift('en');
  return langs;
}

module.exports.getAllAvailableLocals = getAllAvailableLocals;
