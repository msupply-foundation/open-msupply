const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const CopyPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const prod = process.env.NODE_ENV === 'production';
const { dependencies } = require('./package.json');
const path = require('path');

module.exports = {
  mode: prod ? 'production' : 'development',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    library: 'module',
    libraryTarget: 'umd',
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
      name: 'ShippingStatus',
      remotes: {},
      exposes: {
        ShippingStatus: './src/ShippingStatus.tsx',
      },
      shared: {
        ...dependencies,
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
    new CopyPlugin({
      patterns: [{ from: './plugin.json', to: 'plugin.json' }],
    }),
  ],
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
