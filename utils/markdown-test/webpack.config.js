var path = require('path');
var webpack = require('webpack');

module.exports = {
  name: 'script',
  target: 'web',
  mode: 'development',

  entry: [ path.resolve(__dirname, './mdtest.js') ],

  output: {
    path: __dirname,
    filename: 'script.js',
  },

  resolve: {
    extensions: ['.js', '.jsx' ],
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        loader: 'babel-loader',
        options: {
          rootMode: 'upward-optional',
        },
      },
    ],
  },

  stats: {
    colors: true,
  },
};
