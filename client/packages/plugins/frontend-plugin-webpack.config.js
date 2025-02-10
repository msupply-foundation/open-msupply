const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const prod = process.env.NODE_ENV === 'production';

module.exports = ({ pluginName, distDir }) => ({
  mode: prod ? 'production' : 'development',
  entry: './src/plugin.tsx',
  output: {
    path: distDir,
    // 'asyncChunks' should produce one js bundle, this can be remove or changed to "filename: '[name][fullhash].[ext]"
    // but it produces a larger less compressible overall bundle, which is not ideal for sync but can be used for
    // central server only plugins
    asyncChunks: false,
    publicPath: 'auto',
    clean: true,
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
      name: pluginName,
      exposes: { plugin: './src/plugin' },
      shared: {
        '@openmsupply-client/common': {
          // Required version 'false' just means use whatever version is give by the host
          requiredVersion: false,
          singleton: true,
          eager: true,
        },
        react: {
          eager: true,
          singleton: true,
          requiredVersion: false,
        },
        'react-dom': {
          eager: true,
          singleton: true,
          requiredVersion: false,
        },
        'react-singleton-context': {
          singleton: true,
          eager: true,
          requiredVersion: false,
        },
      },
    }),
  ],
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
});
