import fs from 'fs';
import { CapacitorConfig } from '@capacitor/cli';

const localConfigPath = './capacitor.config.local.json';

const localConfig: CapacitorConfig | undefined = fs.existsSync(localConfigPath)
  ? JSON.parse(fs.readFileSync(localConfigPath, 'utf-8'))
  : undefined;

// This file is used to generate packages/android/app/src/main/assets/capacitor.config.json
// run `yarn apply-config` when changing this file (or this command will run automatically on build)

const config: CapacitorConfig = {
  appId: 'org.openmsupply.client',
  appName: 'Open mSupply',
  // Source dir `npx cap copy` ships into the APK (assets/public), from where
  // FrontendAssets copies it to <filesDir>/frontend for the embedded server.
  // Release: the staged dual-frontend bundle (new FE at /, old UI at /old-ui/)
  // assembled by stage-transition-frontend.sh. Debug: the single host build,
  // unchanged (debug serves from webpack, so no fetch of the new FE is forced).
  webDir:
    process.env['DEBUG_BUILD'] === 'true'
      ? '../host/dist/'
      : './frontend-bundle',
  // bundledWebRuntime was removed in @capacitor/cli v4+
  android: {
    path: './',
    // Required to access discovery graphql on http
    allowMixedContent: true,
    // Required for getPlatform() to return 'android' rather than 'web' when serving a valid URL in the webview
    useLegacyBridge: true,
  },
  server: {
    url: 'https://localhost:8000',
    // If hostname is kept as localhost then Capacitor localServer will try to use bundled web app vs web app from remote/webpack server
    hostname: 'should.notmatch.localhost',
    // Required to access discovery graphql on http
    cleartext: true,
    androidScheme: 'https',
  },
  // Apply additional local config if it exists and we are in debug mode
  ...(process.env['DEBUG_BUILD'] === 'true' ? localConfig : undefined),
};

export default config;
