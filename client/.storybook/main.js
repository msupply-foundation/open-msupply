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
  stories: ['../packages/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    {
      name: 'storybook-addon-swc',
      options: {
        enable: true,
        enableSwcLoader: true,
        swcLoaderOptions: {
          jsc: {
            parser: {
              dynamicImport: true,
              syntax: 'typescript',
              tsx: true,
              sourceMap: true,
              exportDefaultFrom: true,
              exportNamespaceFrom: true,
              // decorators: false,
              // decoratorsBeforeExport: true,
            },
            target: 'es2015',
          },
        },
      },
    },
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
