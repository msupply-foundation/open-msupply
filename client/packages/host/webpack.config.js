const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin = webpack.container.ModuleFederationPlugin;
const path = require('path');
const dependencies = require('./package.json').dependencies;
const BundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
class DummyWebpackPlugin {
  apply(compiler) {
    compiler.hooks.run.tap('DummyWebpackPlugin', () => {});
  }
}

module.exports = env => {
  const isProduction = !!env.production;
  const bundleAnalyzerPlugin = !!env.stats
    ? new BundleAnalyzerPlugin({
        /**
         * In "server" mode analyzer will start HTTP server to show bundle report.
         * In "static" mode single HTML file with bundle report will be generated.
         * In "json" mode single JSON file with bundle report will be generated
         */
        analyzerMode: 'json',
        generateStatsFile: false,
      })
    : new DummyWebpackPlugin();

  return {
    entry: './src/index',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? undefined : 'source-map',
    devServer: {
      hot: true,
      static: isProduction
        ? path.join(__dirname, 'dist')
        : path.join(__dirname, 'public'),

      port: 3003,
      historyApiFallback: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods':
          'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers':
          'X-Requested-With, content-type, Authorization',
      },
    },
    resolve: {
      extensions: ['.js', '.css', '.ts', '.tsx'],
      plugins: [new TsconfigPathsPlugin()],
      // Require condition needed for mui date pickers v8, until mui upgraded to v7
      conditionNames: ['require', '...'],
    },
    output: {
      publicPath: '/',
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      chunkFilename: '[contenthash].js',
      clean: {
        keep: asset => asset.includes('.gitignore'), // see dist/.gitignore for comments
      },
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        // Default minSize is 20KB, which means a small module used in two
        // feature chunks just gets inlined into both. Several internal
        // helpers (e.g. `system/src/utils.ts`, ActivityLog/Report shared
        // components) hit this case; lowering the threshold lets webpack
        // pull them into a shared chunk instead.
        minSize: 1024,
        cacheGroups: {
          // Vendor split: every npm package above the default threshold
          // goes into its own shared vendor chunk.
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
          // Anything shared across 2+ feature chunks from our workspace
          // is hoisted out, regardless of size.
          sharedInternal: {
            test: /[\\/]packages[\\/](system|common|programs|coldchain|invoices|requisitions|inventory|purchasing|reports|dashboard|config)[\\/]src[\\/]/,
            minChunks: 2,
            minSize: 0,
            priority: -20,
            reuseExistingChunk: true,
            enforce: true,
          },
          default: {
            minChunks: 2,
            priority: -30,
            reuseExistingChunk: true,
          },
        },
      },
      usedExports: true,
    },
    module: {
      rules: [
        {
          test: /\.[t|j]sx?$/,
          loader: isProduction ? 'ts-loader' : 'swc-loader',
          exclude: /node_modules/,
          options: isProduction
            ? {
                /* ts-loader options */
              }
            : {
                /* swc-loader options */
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
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(woff(2)?|ttf|eot)$/,
          type: 'asset/resource',
          generator: {
            filename: './fonts/[name][ext]',
          },
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new ReactRefreshWebpackPlugin(),
      new webpack.DefinePlugin({
        API_HOST: JSON.stringify(env.API_HOST),
        LOCAL_PLUGINS: JSON.stringify(require('./getLocalPlugins.js')),
        LANG_VERSION: Date.now(),
      }),
      bundleAnalyzerPlugin,
      new HtmlWebpackPlugin({
        favicon: './public/favicon.ico',
        template: './public/index.html',
      }),
      new CopyPlugin({
        patterns: [
          { from: './public/game', to: 'game' },
          {
            from: './public/BrowserPrint-3.1.250.min.js',
            to: 'BrowserPrint-3.1.250.min.js',
          },
          {
            context: path.resolve(
              __dirname,
              '..',
              'common',
              'src',
              'intl',
              'locales'
            ),
            from: '**/*.json',
            to: 'locales/',
          },
        ],
      }),
      new ModuleFederationPlugin({
        name: 'host',
        shared: [
          {
            '@openmsupply-client/common': {
              singleton: true,
              eager: true,
              // Version here needs to be specified to avoid webpack warnings, since this is the host it would
              // share the current state of @openmsupply-client/common
              requiredVersion: require('../common/package.json').version,
            },
            react: {
              singleton: true,
              eager: true,
              requiredVersion: dependencies.react,
            },
            'react-dom': {
              singleton: true,
              eager: true,
              requiredVersion: dependencies['react-dom'],
            },
            'react-singleton-context': {
              singleton: true,
              eager: true,
              requiredVersion: require('../common/package.json').dependencies[
                'react-singleton-context'
              ],
            },
          },
        ],
      }),
    ],
  };
};
