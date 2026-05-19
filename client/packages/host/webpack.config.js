const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');
const yaml = require('js-yaml');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin = webpack.container.ModuleFederationPlugin;
const path = require('path');
const dependencies = require('./package.json').dependencies;
const BundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

// Server writes its bound port here on startup so we can proxy to it even when
// it's an OS-assigned random port (multi-worktree support). Resolved per-request
// via the `router` option below, so it survives webpack starting before the server.
const DEV_PORT_FILE = path.resolve(__dirname, '../../../server/.dev-port');
const backendTarget = () => {
  try {
    const port = parseInt(fs.readFileSync(DEV_PORT_FILE, 'utf8').trim(), 10);
    if (port > 0) return `http://localhost:${port}`;
  } catch {}
  return 'http://localhost:8000';
};

// The front-facing port (what the browser hits) is shared with the Rust server's
// config: read it from local.yaml (or base.yaml) so a worktree can pin its own
// port by editing one file.
const CONFIG_DIR = path.resolve(__dirname, '../../../server/configuration');
const readServerPortFromYaml = () => {
  for (const file of ['local.yaml', 'base.yaml']) {
    try {
      const doc = yaml.load(fs.readFileSync(path.join(CONFIG_DIR, file), 'utf8'));
      const port = doc && doc.server && doc.server.port;
      if (typeof port === 'number' && port > 0) return port;
    } catch {}
  }
  return 3003;
};
const FRONT_FACING_PORT = parseInt(
  process.env.APP__SERVER__PORT || readServerPortFromYaml(),
  10
);
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

      port: FRONT_FACING_PORT,
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
          // `target` is the initial value; `router` resolves it per-request so the
          // proxy picks up the server's port from .dev-port whenever it's written
          // (handles webpack starting before the server has compiled).
          target: env.API_HOST || backendTarget(),
          router: env.API_HOST ? undefined : () => backendTarget(),
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
