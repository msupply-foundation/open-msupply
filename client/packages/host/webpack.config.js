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
    public: 'http://localhost:3003/',
    port: 3003,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers':
        'X-Requested-With, content-type, Authorization',
    },
    open: true,
  },
  resolve: {
    extensions: ['.js', '.css', '.ts', '.tsx'],
  },
  output: {
    publicPath: 'http://localhost:3003/',
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
        dashboard: 'dashboard@http://localhost:3004/remoteEntry.js',
        transactions: 'transactions@http://localhost:3005/remoteEntry.js',
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
      favicon: './public/favicon.ico',
      template: './public/index.html',
    }),
  ],
};
