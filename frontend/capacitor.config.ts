import { readFileSync } from 'node:fs';
import type { CapacitorConfig } from '@capacitor/cli';

// The dev-server port is per checkout (DEV_SERVER_PORT in .env.local, read by
// vite.config.ts; each worktree gets its own — scripts/worktree.sh). Same
// precedence as vite: a real shell variable wins over the file, 3005 is only
// the unconfigured default. scripts/dev-android.sh exports the value it
// resolved, so a scripted run and a hand-run `cap sync` agree.
const devServerPort = () => {
  if (process.env.DEV_SERVER_PORT) return process.env.DEV_SERVER_PORT;
  try {
    // cwd-relative, matching vite's own loadEnv(mode, process.cwd(), ''): the
    // capacitor CLI runs from the project root. (No import.meta.url here — the
    // CLI transpiles this config to CommonJS, where it is not available.)
    const envLocal = readFileSync('.env.local', 'utf8');
    return (
      /^\s*DEV_SERVER_PORT\s*=\s*['"]?(\d+)/m.exec(envLocal)?.[1] ?? '3005'
    );
  } catch {
    return '3005'; // no .env.local — vite's unconfigured default
  }
};

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
  // server through `adb reverse` instead of the bundled assets, on this
  // checkout's dev port (devServerPort above — the same port the script
  // tunnels)
  ...(process.env.DEV_ANDROID
    ? {
        server: {
          url: `http://localhost:${devServerPort()}`,
          cleartext: true,
        },
      }
    : {
        // Client mode navigates the WebView to the CHOSEN server's own
        // origin (spec/desktop AC-DT19's Android sibling; DiscoveryHostPlugin
        // navigate) — any LAN address, undecidable at build time, so
        // a wildcard rather than a hostname list. cleartext for http
        // servers (dev/LAN deployments announce protocol=http). SPIKE
        // posture, like MainActivity's SSL bypass — the real trust model is
        // spec/android § connection trust.
        server: {
          allowNavigation: ['*'],
          cleartext: true,
        },
      }),
};

export default config;
