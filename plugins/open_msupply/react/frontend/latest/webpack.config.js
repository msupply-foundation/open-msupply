const { merge } = require('webpack-merge');
// Expecting for every plugin to be developed from 'common/packages/plugins/{plugin repo}/frontend/{version}'
const generateBaseConfig = require('../../../frontend-plugin-webpack.config.js');
const path = require('path');

const pluginName = require('./package.json').name;
const distDir = path.resolve(__dirname, 'dist');
const extendConfig = {};

module.exports = merge(generateBaseConfig({ pluginName, distDir }), extendConfig);
