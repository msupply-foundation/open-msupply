const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const webpack = require('webpack');
const HotModuleReplacementPlugin = webpack.HotModuleReplacementPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const ModuleFederationPlugin = webpack.container.ModuleFederationPlugin;
const path = require('path');
// const deps = require('./package.json').dependencies;
const BundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  entry: './src/index',
  mode: isDevelopment ? 'development' : 'production',
  devServer: {
    hot: true,
    static: path.join(__dirname, 'dist'),

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
    filename: '[name].bundle.js',
    chunkFilename: '[name].[id].[contenthash].js',
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
    new HotModuleReplacementPlugin(),

    new ReactRefreshWebpackPlugin(),

    new BundleAnalyzerPlugin({
      /**
       * In "server" mode analyzer will start HTTP server to show bundle report.
       * In "static" mode single HTML file with bundle report will be generated.
       * In "json" mode single JSON file with bundle report will be generated
       */
      analyzerMode: 'disabled',
    }),

    new HtmlWebpackPlugin({
      favicon: './public/favicon.ico',
      template: './public/index.html',
    }),

    // new ModuleFederationPlugin({
    //   name: 'host',
    //   filename: 'remoteEntry.js',
    //   remotes: {
    //     customers: 'customers@http://localhost:3007/remoteEntry.js',
    //     dashboard: 'dashboard@http://localhost:3004/remoteEntry.js',
    //     transactions: 'transactions@http://localhost:3005/remoteEntry.js',
    //   },
    //   exposes: {
    //     './Host': './src/Host',
    //   },
    //   shared: [
    //     {
    //       ...deps,
    //       react: {
    //         singleton: true,
    //         requiredVersion: deps.react,
    //       },
    //       'react-dom': {
    //         singleton: true,
    //         requiredVersion: deps['react-dom'],
    //       },
    //     },
    //     {
    //       '@openmsupply-client/common': {
    //         requiredVersion: require('../common/package.json').version,
    //       },
    //     },
    //   ],
    // }),
  ],
};
