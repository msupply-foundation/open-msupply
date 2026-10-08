const { merge } = require('webpack-merge');
// Expecting for every plugin to be developed from 'common/packages/plugins/{plugin repo}/backend/{version}'
const generateBaseConfig = require('../../../backend-plugin-webpack.config.js');
const path = require('path');

const distDir = path.resolve(__dirname, 'dist');
const extendConfig = {
  module: {
    rules: [
      {
        test: /\.graphql$/i,
        // raw-loader
        type: 'asset/source',
      },
    ],
  },
};

module.exports = merge(generateBaseConfig({ distDir }), extendConfig);
