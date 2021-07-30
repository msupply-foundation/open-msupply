/* eslint-disable @typescript-eslint/no-var-requires */
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin =
  require('webpack').container.ModuleFederationPlugin;
const path = require('path');
const deps = require('./package.json').dependencies;
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  entry: './src/index',
  mode: 'development',
  devServer: {
    static: path.join(__dirname, 'dist'),
    port: 3003,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers':
        'X-Requested-With, content-type, Authorization',
    },
    // open: true,
  },
  resolve: {
    extensions: ['.js', '.css', '.ts', '.tsx'],
  },
  output: {
    publicPath: 'auto',
    chunkFilename: '[id].[contenthash].js',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
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
    // new BundleAnalyzerPlugin(),
    new ModuleFederationPlugin({
      name: 'host',
      filename: 'remoteEntry.js',
      remotes: {
        // invoices: 'invoices@http://localhost:3005/remoteEntry.js',
        dashboard: 'dashboard@http://localhost:3004/remoteEntry.js',
        // profile: 'profile@http://localhost:3006/remoteEntry.js',
        host: 'host@http://localhost:3003/remoteEntry.js',
        redux_toolkit_invoices:
          'redux_toolkit_invoices@http://localhost:3009/remoteEntry.js',
        // mobx_invoices: 'mobx_invoices@http://localhost:3011/remoteEntry.js',
        // mst_invoices: 'mst_invoices@http://localhost:3012/remoteEntry.js',
        // mobx_rq_invoices: 'mobx_rq_invoices@http://localhost:3013/remoteEntry.js',
      },
      exposes: {
        './Host': './src/Host',
        './Service': './src/Service',
      },
      shared: [
        {
          ...deps,
          react: {
            singleton: true,
            requiredVersion: deps.react,
          },
          'react-dom': {
            singleton: true,
            requiredVersion: deps['react-dom'],
          },
        },
        {
          '@openmsupply-client/common': {
            requiredVersion: require('../common/package.json').version,
          },
        },
        // Workaround explanation: https://www.youtube.com/watch?v=-LNcpralkjM&t=540
        './src/Service',
      ],
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};
