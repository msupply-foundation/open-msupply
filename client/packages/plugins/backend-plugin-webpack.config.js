const path = require('path');

module.exports = ({ distDir }) => ({
  mode: 'production',
  entry: './src/plugin.ts',
  output: {
    path: distDir,
    filename: 'plugin.js',
    library: {
      type: 'module',
    },
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.ts'],
    alias: {
      '@common': path.resolve(__dirname, 'backendCommon'),
    },
  },
  optimization: {
    usedExports: true,
    sideEffects: false,
  },
  experiments: {
    outputModule: true,
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
    ],
  },
});
