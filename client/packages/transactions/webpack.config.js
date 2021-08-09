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
  mode: 'development',
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
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.css'],
  },
  module: {
    rules: [
      {
        test: /\.[t|j]sx?$/,
        loader: 'swc-loader',
        exclude: /node_modules/,
        options: {
          jsc: {
            parser: {
              dynamicImport: true,
              syntax: 'typescript',
              tsx: true,
            },
            target: 'es2015',
          },
        },
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
    // Chunks: ['main'] explained here:
    // https://github.com/module-federation/module-federation-examples/issues/358#issuecomment-844455904
    // Seems if there is more than one bundle being served HMR stops working. Can't use optimization: single
    // as that causes MF to stop working.
    new HtmlWebpackPlugin({
      template: './public/index.html',
      chunks: ['main'],
    }),
    isDevelopment && new webpack.HotModuleReplacementPlugin(),
    isDevelopment && new ReactRefreshWebpackPlugin(),
  ].filter(Boolean),
};
