const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

rules.push({
  test: /\.(png|svg|jpg|jpeg|gif)$/i,
  type: 'asset/resource',
});

module.exports = {
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
  plugins: plugins,
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.css'],
    plugins: [new TsconfigPathsPlugin()],
  },
};
