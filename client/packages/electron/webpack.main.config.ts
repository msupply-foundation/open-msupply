import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/electron.ts',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  // node-hid 3 finds its native binary at runtime from its own directory
  // (pkg-prebuilds), which bundling would move out from under it. Loaded from
  // node_modules instead: forge.config.ts § shipExternals puts it there.
  externals: {
    'node-hid': 'commonjs node-hid',
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
    plugins: [new TsconfigPathsPlugin()], // creates alias entries for the paths in tsconfig.json
  },
};
