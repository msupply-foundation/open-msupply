/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-var-requires

const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin =
  require('webpack').container.ModuleFederationPlugin;
const path = require('path');
const deps = require('./package.json').dependencies;
const webpack = require('webpack');
const isDevelopment = process.env.NODE_ENV !== 'production';

const ReactRefreshTypeScript = require('react-refresh-typescript');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = {
  entry: './src/index',
  mode: isDevelopment ? 'development' : 'production',
  devServer: {
    static: path.join(__dirname, 'dist'),
    port: 3005,
    historyApiFallback: true,
    hot: true,
  },
  output: {
    publicPath: 'auto',
    chunkFilename: '[id].[contenthash].js',
  },
  optimization: {
    runtimeChunk: 'single',
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.css'],
  },

  module: {
    rules: [
      {
        test: /\.[t|j]sx?$/,
        loader: 'swc-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'transactions',
      filename: 'remoteEntry.js',
      exposes: {
        './TransactionService': './src/TransactionService',
      },
      shared: {
        ...deps,
        react: {
          singleton: true,
          requiredVersion: deps.react,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: deps['react-dom'],
        },
        '@openmsupply-client/common': {
          requiredVersion: require('../common/package.json').version,
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    isDevelopment && new webpack.HotModuleReplacementPlugin(),
    isDevelopment && new ReactRefreshWebpackPlugin(),
  ].filter(Boolean),
};
