import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
    parser: {
      javascript: {
        // https://github.com/webpack/webpack/issues/7378#issuecomment-1153032726
        // https://webpack.js.org/configuration/module/#moduleparserjavascriptreexportexportspresence
        // otherwise getting errors for re-export of types
        reexportExportsPresence: false,
      },
    },
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    plugins: [new TsconfigPathsPlugin()],
  },
};
