import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

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
  externals: {
    serialport: 'serialport',
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
    alias: {
      '@common/utils': path.resolve(__dirname, '../common/src/utils'),
    },
  },
};
