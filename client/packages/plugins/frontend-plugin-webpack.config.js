const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const prod = process.env.NODE_ENV === 'production';

module.exports = ({ distDir }) => ({
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
    // Require condition needed for mui date pickers v8, until mui upgraded to v7
    conditionNames: ['require', '...'],
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
  plugins: [],
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
});
