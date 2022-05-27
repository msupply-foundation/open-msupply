const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const toPath = filePath => path.join(process.cwd(), filePath);

module.exports = {
  core: {
    builder: 'webpack5',
    options: {
      lazyCompilation: true,
    },
  },
  staticDirs: ['../packages/host/public'],
  typescript: { reactDocgen: 'react-docgen' },
  reactOptions: {
    fastRefresh: true,
  },
  stories: [
    '../packages/**/*.stories.mdx',
    '../packages/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
  webpackFinal: async config => {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          '@emotion/core': toPath('node_modules/@emotion/react'),
          'emotion-theming': toPath('node_modules/@emotion/react'),
        },
        plugins: [
          new TsconfigPathsPlugin({ extensions: config.resolve.extensions }),
        ],
      },
    };
  },
};
