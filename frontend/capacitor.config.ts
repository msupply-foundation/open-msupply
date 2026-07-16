import type { CapacitorConfig } from '@capacitor/cli';

// Spike: Capacitor used in its NORMAL mode — the web bundle ships in the APK
// and is served from the capacitor origin (https://localhost). The embedded
// Rust server is API-only from the WebView's point of view (kdd/android Fork 5,
// option B/C boundary spike).
const config: CapacitorConfig = {
  // same appId as the legacy Open mSupply app — see kdd/android (signing)
  appId: 'org.openmsupply.client',
  appName: 'Open mSupply',
  webDir: 'dist',
  // http (not https) scheme would change origin to http://localhost — keep default https
  android: {
    // dev server over adb reverse is plain http
    allowMixedContent: true,
  },
  // dev loop (scripts/dev-android.sh): load the UI from the host's vite dev
  // server through `adb reverse` instead of the bundled assets
  // (:3005 — this repo's vite dev port, see vite.config.ts)
  ...(process.env.DEV_ANDROID
    ? { server: { url: 'http://localhost:3005', cleartext: true } }
    : {}),
};

export default config;
