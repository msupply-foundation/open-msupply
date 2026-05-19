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

// Backend address for the proxy. The VSCode `dev: all` task picks a free port
// and exports OMS_BACKEND_PORT to both the cargo and webpack processes so they
// agree without any side-channel file. Fallback covers running webpack alone
// against a server already bound to the conventional 8000.
const backendTarget = () =>
  `http://localhost:${process.env.OMS_BACKEND_PORT || 8000}`;

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
        analyzerMode: 'disabled',
        generateStatsFile: true,
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

      // Listen port comes from webpack's `--port` CLI flag (set by the VSCode
      // task or `yarn start -- --port N`).
      // OSC 2: set the pane/tab title to include the bound URL. Picked up by zellij,
      // VS Code's terminal, iTerm2, etc. — invisible in the output stream.
      // BEL (\x07) terminator is the original xterm convention and the one zellij
      // parses most reliably; ST (\x1b\\) sometimes loses the trailing backslash
      // through layered shells.
      onListening: devServer => {
        const port = devServer.server.address().port;
        process.stdout.write(`\x1b]2;client http://localhost:${port}\x07`);
      },
      historyApiFallback: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods':
          'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers':
          'X-Requested-With, content-type, Authorization',
      },
      open: false,
      // Proxy every backend route through to the Rust server so dev runs
      // single-origin. `ws: true` carries /graphql/ws (subscriptions); webpack's
      // own HMR WS uses a separate /ws path, untouched by this.
      proxy: [
        {
          context: [
            '/graphql',
            '/files',
            '/sync_files',
            '/upload',
            '/fridge-tag',
            '/frontend_plugins',
            '/plugins',
            '/central',
            '/support',
            '/print',
            '/coldchain',
            '/custom-translations',
          ],
          target: env.API_HOST || backendTarget(),
          ws: true,
          changeOrigin: true,
        },
      ],
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
