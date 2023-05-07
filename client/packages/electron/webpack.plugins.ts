/* eslint-disable @typescript-eslint/no-var-requires */
import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

export const plugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
  new CopyPlugin({
    patterns: [
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
        to: './locales/',
      },
    ],
  }),
];
