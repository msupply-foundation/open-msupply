// This file is used to get a list of plugins to load locally for hot reloading during dev
// Script expects the file structure to be:
// packages/plugins/{repository or plugin name}/frontend/latest

const fs = require('fs');
const path = require('path');
const PLUGIN_ROOT_DIR = path.join('../', 'plugins');

// We can tweak this config to find only specific version for specific plugin (when working with older versions)

// const exclude = [path.join('examples', 'frontend', 'latest')];
// const include = [path.join('examples', 'frontend', '2_6')];

const exclude = [];
const include = [];

const plugins = [
  ...fs.readdirSync(PLUGIN_ROOT_DIR).map(pluginName => ({
    pluginPath: path.join(pluginName, 'frontend', 'latest'),
    fullPluginPath: path.join(
      PLUGIN_ROOT_DIR,
      pluginName,
      'frontend',
      'latest'
    ),
  })),
  ...include.map(pluginPath => ({
    pluginPath,
    fullPluginPath: path.join(PLUGIN_ROOT_DIR, pluginPath),
  })),
]
  .filter(({ pluginPath }) => !exclude.includes(pluginPath))
  .filter(({ fullPluginPath }) => {
    try {
      return fs.lstatSync(fullPluginPath).isDirectory();
    } catch (e) {
      return false;
    }
  })
  .map(({ fullPluginPath, pluginPath }) => ({
    pluginPath,
    pluginCode: require(path.join(fullPluginPath, 'package.json')).name,
  }));

console.log('local plugins', plugins);

module.exports = plugins;
