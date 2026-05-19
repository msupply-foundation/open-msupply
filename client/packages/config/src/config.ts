declare const API_HOST: string;

// For production, API is on the same domain/ip and port as web app, available through sub-route
// i.e. web app is on https://my.openmsupply.com/, then graphql will be available https://my.openmsupply.com/graphql
// and files on https://my.openmsupply.com/files

// For development, webpack-dev-server proxies backend routes through to the Rust
// server, so the frontend is single-origin with its API just like production.
// API_HOST (via webpack.DefinePlugin, e.g. `webpack server --env API_HOST=https://demo-open.msupply.org`)
// overrides this — used by start-remote and any cross-origin debugging flow.

// Important to note, if we overwrite API_HOST in development, we should use ip/domain that is known outside of localhost
// because web app in development mode may be accessed by clients on different machine (i.e. when debugging Android app)

const isProductionBuild = process.env['NODE_ENV'] === 'production';
const { port, hostname, protocol } = window.location;

const sameOriginApiHost = `${protocol}//${hostname}:${port}`;

const developmentApiHost =
  (typeof API_HOST !== 'undefined' && API_HOST) || sameOriginApiHost;
const apiHost = isProductionBuild ? sameOriginApiHost : developmentApiHost;

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
  PRINT_LABEL_PRESCRIPTION: `${apiHost}/print/label-prescription`,
  ANDROID_DATA_FILES_PATH: `static_files/sync_files`,
  REPORT_UPLOAD_URL: `${apiHost}/upload`,
};

export default Environment;
