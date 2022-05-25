import { Capacitor } from '@capacitor/core';


declare const API_HOST: string;

// For production we get URL relative to web app
const isProductionBuild = process.env['NODE_ENV'] === 'production';
// http://localhost:8000 is default for remote server
// API_HOST is available through webpack.DefinePlugin (i.e. webpack server --env API_HOST='http://localhost:8001')
const devServerURL = API_HOST || 'http://localhost:8000';

// const devServerURL = 'http://localhost:8000'; // - default URL for the backend graphql server
const { port, hostname, protocol } = window.location;

// For mobile always use https://localhost:8000, as per MainActivity.java
const productionServerUrl =
  Capacitor.getPlatform() === 'web'
    ? `${protocol}//${hostname}:${port}`
    : 'https://localhost:8000';

const config = {
  API_HOST: isProductionBuild ? productionServerUrl : devServerURL
};

export default config;
