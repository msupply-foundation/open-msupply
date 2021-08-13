/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-var-requires

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {
  container: { ModuleFederationPlugin },
} = webpack;
const path = require('path');
const deps = require('./package.json').dependencies;
const isDevelopment = process.env.NODE_ENV !== 'production';
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = {
  entry: './src/index',
  mode: 'development',
  devServer: {
    static: path.join(__dirname, 'dist'),
    port: 3006, // ${UPDATE} : This should contain a port number to run this MFE on. It should be unique to this package.
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
      // ${UPDATE} - The name of your package. This should be unique to all other packages and will be used
      // from other remote packages to refer to this package.
      name: 'template',
      filename: 'remoteEntry.js',
      exposes: {
        // ${UPDATE} : Expose all of this packages components here.
        // They can be imported from other remotes through the syntax
        // React.lazy(() => import('${name of this service}/${key of an exposed component}'))
      },
      // Shared dependencies can be updated, but these defaults should suffice.
      // These defaults will share to all other remotes, all of the dependencies in this packages
      // package.json.
      // React and react-dom are explicitly set as singletons to ensure only one reference is used
      // throughout the application.
      // The @openmsupply-client is a shared lerna package within the repo.
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
          requiredVersion: require('@openmsupply-client/common/package')
            .version,
        },
      },
    }),
    // Chunks: ['main'] explained here:
    // https://github.com/module-federation/module-federation-examples/issues/358#issuecomment-844455904
    // Seems if there is more than one bundle being served HMR stops working. Can't use optimization: single
    // as that causes MF to stop working.
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    isDevelopment && new webpack.HotModuleReplacementPlugin(),
    isDevelopment && new ReactRefreshWebpackPlugin(),
  ].filter(Boolean),
};
