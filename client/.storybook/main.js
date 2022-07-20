const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const toPath = filePath => path.join(process.cwd(), filePath);

module.exports = {
  staticDirs: ['../packages/host/public'],
  typescript: { reactDocgen: 'react-docgen' },
  framework: '@storybook/react',
  core: {
    builder: {
      name: 'webpack5',
      options: {
        lazyCompilation: true,
      },
    },
  },
  features: {
    storyStoreV7: true,
  },
  stories: ['../packages/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
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
        plugins: [new TsconfigPathsPlugin()],
      },
    };
  },
};
