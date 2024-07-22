import { dirname, join } from "path";
const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const toPath = filePath => path.join(process.cwd(), filePath);
module.exports = {
  staticDirs: ['../packages/host/public'],
  framework: {
    name: getAbsolutePath("@storybook/react-webpack5"),
    options: {
      builder: {
        lazyCompilation: true,
      },
    },
  },
  stories: ['../packages/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    getAbsolutePath("@storybook/addon-links"),
    getAbsolutePath("@storybook/addon-essentials"),
    getAbsolutePath("@storybook/addon-interactions"),
    '@storybook/addon-webpack5-compiler-swc',
    '@chromatic-com/storybook'
  ],
  typescript: {
    check: false,
    checkOptions: {},
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      // speeds up storybook build time
      allowSyntheticDefaultImports: false,
      // speeds up storybook build time
      esModuleInterop: false,
      // makes union prop types like variant and size appear as select controls
      shouldExtractLiteralValuesFromEnum: true,
      // makes string and boolean types that can be undefined appear as inputs and switches
      shouldRemoveUndefinedFromOptional: true,
      // Filter out third-party props from node_modules except @mui packages
      propFilter: prop =>
        prop.parent
          ? !/node_modules\/(?!@mui)/.test(prop.parent.fileName)
          : true,
    },
  },
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
      module: {
        ...config.modules,
        rules: [
          ...config.module.rules,
          {
            test: /\.tsx?$/,
            use: [
              {
                loader: 'babel-loader',
                options: {
                  sourceType: 'unambiguous',
                  babelrc: false,
                  presets: [['react-app', { flow: true, typescript: true }]],
                },
              },
            ],
          },
        ],
      },
    };
  },
  docs: {},
};

function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, "package.json")));
}
