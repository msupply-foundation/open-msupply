const path = require('path');
const webpack = require('webpack');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const pluginName = require('./package.json').name;
const createConfig = require('../../../frontend-plugin-webpack.config.js');

const config = createConfig({
  pluginName,
  distDir: path.resolve(__dirname, 'dist'),
});

if (config.module?.rules) {
  config.module.rules = config.module.rules.map(rule => {
    if (rule.use === 'ts-loader') {
      return {
        ...rule,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: true },
        },
      };
    }

    return rule;
  });
}

webpack(config, (error, stats) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }

  if (!stats) {
    console.error('Webpack did not return build stats');
    process.exit(1);
  }

  const info = stats.toJson();
  if (stats.hasErrors()) {
    console.error(info.errors);
    process.exit(1);
  }

  if (stats.hasWarnings()) {
    console.warn(info.warnings);
  }

  console.log(
    stats.toString({
      colors: true,
      modules: false,
      chunks: false,
      assets: true,
    })
  );
});
