const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin =
  require('webpack').container.ModuleFederationPlugin;
const path = require('path');
const deps = require('./package.json').dependencies;
module.exports = {
  entry: './src/index',
  mode: 'development',
  devServer: {
    static: path.join(__dirname, 'dist'),
    port: 3004,
    historyApiFallback: true,
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
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'dashboard',
      filename: 'remoteEntry.js',
      remotes: {
        // invoices: 'invoices@http://localhost:3005/remoteEntry.js',
        // requisitions: 'requisitions@http://localhost:3007/remoteEntry.js',
        host: 'host@http://localhost:3003/remoteEntry.js',
        dashboard: 'dashboard@http://localhost:3004/remoteEntry.js',
      },
      exposes: {
        './DashboardService': './src/DashboardService',
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
          import: '@openmsupply-client/common/src',
          requiredVersion: require('../common/package.json').version,
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};
