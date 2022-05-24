import { Capacitor } from '@capacitor/core';

// For production we get URL relative to web app
const { port, hostname, protocol } = window.location;

const isProductionBuild = process.env['NODE_ENV'] === 'production';

const devServerURL = 'https://demo-open.msupply.org:8000'; // Demo - site URL
// const devServerURL = 'http://localhost:8000'; // - default URL for the backend graphql server

// For mobile always use https://localhost:8000, as per MainActivity.java
const productionServerUrl =
  Capacitor.getPlatform() === 'web'
    ? `${protocol}//${hostname}:${port}`
    : 'https://localhost:8000';

const config = {
  API_HOST: isProductionBuild ? productionServerUrl : devServerURL,
};

export default config;
