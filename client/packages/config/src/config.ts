declare const API_HOST: string;

// For production, API is on the same domain/ip and port as web app, available through sub-route
// i.e. web app is on https://my.openmsupply.com/, then graphql will be available https://my.openmsupply.com/graphql
// and files on https://my.openmsupply.com/files

// For development, API server and front end are launched separately on different ports and possible different IPs
// by default we assume development API server is launched on the same domain/ip and on port 8000. We can overwrite this
// with API_HOST which is available through webpack.DefinePlugin (i.e. webpack server --env API_PORT=800 --env API_IP 'localhost')

// Important to note, if we overwrite API_HOST in development, we should use ip/domain that is known outside of localhost
// because web app in development mode may be accessed by clients on different machine (i.e. when debugging Android app)

const isProductionBuild = process.env['NODE_ENV'] === 'production';
const { port, hostname, protocol } = window.location;

const defaultDevelopmentApiHost = `${protocol}//${hostname}:8000`;
const productionApiHost = `${protocol}//${hostname}:${port}`;

const developmentApiHost =
  (typeof API_HOST !== 'undefined' && API_HOST) || defaultDevelopmentApiHost;
const apiHost = isProductionBuild ? productionApiHost : developmentApiHost;

const pluginUrl = `${apiHost}/plugins`;

export const Environment = {
  API_HOST: apiHost,
  FILE_URL: `${apiHost}/files?id=`,
  GRAPHQL_URL: `${apiHost}/graphql`,
  PLUGIN_URL: pluginUrl,
  SYNC_FILES_URL: `${apiHost}/sync_files`,
  UPLOAD_FRIDGE_TAG: `${apiHost}/fridge-tag`,
  PRINT_LABEL_QR: `${apiHost}/print/label-qr`,
  PRINT_LABEL_TEST: `${apiHost}/print/label-test`,
};

export default Environment;
