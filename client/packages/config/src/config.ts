// API is on the same domain/ip and port as the web app, available through sub-routes
// i.e. web app is on https://my.openmsupply.com/, graphql is at https://my.openmsupply.com/graphql
// and files at https://my.openmsupply.com/files.
//
// In development, webpack-dev-server proxies backend routes through to the Rust
// server (see webpack.config.js), so the frontend is single-origin with its API
// just like production. To point dev at a different backend (e.g. the demo
// server), set OMS_BACKEND_URL when starting webpack — the proxy target moves,
// the bundle stays same-origin.

const { port, hostname, protocol } = window.location;
const apiHost = `${protocol}//${hostname}:${port}`;

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
