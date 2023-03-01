import { CapacitorConfig } from '@capacitor/cli';

// This file is used to generate packages/android/app/src/main/assets/capacitor.config.json
// run `yarn apply-config` when changing this file

const config: CapacitorConfig = {
  appId: 'org.openmsupply.client',
  appName: 'openmsupply-client',
  // This is only needed for `npx cap copy` to work, it doesn't have to point to actual bundle
  // bundle is server by remote server (local or discovered) or through webpack if debugging (see comment below)
  webDir: 'notexistent',
  bundledWebRuntime: false,
  android: {
    path: './',
    // Required to access discovery graphql on http
    allowMixedContent: true,
  },
  server: {
    url: 'https://localhost:8000',
    // If hostname is kept as localhost then Capacitor localServer will try to use bundled web app vs web app from remote/webpack server
    hostname: 'should.notmatch.localhost',
    // Required to access discovery graphql on http
    cleartext: true,
  },
  plugins: {
    // Below will turn on debug (uncomment and run `yarn apply-config`)
    //   NativeApi: {
    //     debugUrl: 'http://192.168.178.146:3003',
    //   },
  },
};

export default config;
