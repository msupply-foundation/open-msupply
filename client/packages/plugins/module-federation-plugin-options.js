module.exports = ({ pluginName }) => ({
  name: pluginName,
  exposes: { plugin: './src/plugin' },
  shared: {
    '@openmsupply-client/common': {
      // Required version 'false' just means use whatever version is give by the host
      requiredVersion: false,
      singleton: true,
      eager: true,
    },
    react: {
      eager: true,
      singleton: true,
      requiredVersion: false,
    },
    'react-dom': {
      eager: true,
      singleton: true,
      requiredVersion: false,
    },
    'react-singleton-context': {
      singleton: true,
      eager: true,
      requiredVersion: false,
    },
  },
});
