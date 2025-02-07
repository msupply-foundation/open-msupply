const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const prod = process.env.NODE_ENV === 'production';

const { dependencies } = require('../../common/package.json');
const path = require('path');
const { name } = require('./package.json');

module.exports = {
  mode: prod ? 'production' : 'development',
  entry: './src/plugin.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    asyncChunks: false,
  },
  resolve: {
    extensions: ['.js', '.css', '.ts', '.tsx'],
    plugins: [new TsconfigPathsPlugin()],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        resolve: {
          extensions: ['.ts', '.tsx', '.js', '.json'],
        },
        use: 'ts-loader',
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  devtool: prod ? undefined : 'source-map',
  plugins: [
    new ModuleFederationPlugin({
      name,
      exposes: { plugin: './src/plugin' },
      shared: {
        ...dependencies,
        '@openmsupply-client/common': {
          import: false,
        },
        react: {
          eager: true,
          singleton: true,
          requiredVersion: dependencies['react'],
        },
        'react-dom': {
          eager: true,
          singleton: true,
          requiredVersion: dependencies['react-dom'],
        },
        'react-singleton-context': { singleton: true, eager: true },
      },
    }),
  ],
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
