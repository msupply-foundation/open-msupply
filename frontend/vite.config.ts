import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

/*
 * Dev server proxies GraphQL + custom translations to the mSupply backend
 * (default :8000; the auth-flow tests rely on 3005 → 8000). Override with
 * DEV_SERVER_PORT / GRAPHQL_PROXY_TARGET. LANG_VERSION busts the cached
 * translation dictionaries on a new production build
 * (src/intl/dictionaryCache); dev uses a fixed token so the cache is stable
 * across reloads.
 */

// The displayed app version (spec/startup/rules.md § App version): the
// package version with the short git SHA appended ("3.00.0 (2ae7bd2)") in
// every build — the demo redeploys nightly from regenerated spec-build
// branches while the package version stays put, so the SHA is what identifies
// a build. Outside a git checkout (tarball/export) the bare version shows.
const appVersion = (): string => {
  const { version } = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8')
  ) as { version: string };
  try {
    const sha = execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return sha ? `${version} (${sha})` : version;
  } catch {
    return version; // not a git checkout
  }
};

export default defineConfig(({ mode }) => ({
  plugins: [solid()],
  // Minimum supported browser is Chromium 138 (the newest WebView installable
  // on Android 9) — see browserslist in package.json. Vite's default target
  // is far more conservative, so raising it skips unneeded transpilation.
  build: { target: 'chrome138' },
  // Lets the same build be mounted at a non-root path (the demo server's
  // /spec track, deploy/build-and-deploy-spec.sh) — Vite rewrites every
  // asset reference to match and exposes it at runtime as
  // import.meta.env.BASE_URL (read by <Router base> in src/App.tsx).
  base: process.env.VITE_BASE_PATH || '/',
  define: {
    LANG_VERSION: JSON.stringify(
      mode === 'production' ? String(Date.now()) : 'dev'
    ),
    APP_VERSION: JSON.stringify(appVersion()),
  },
  server: {
    port: Number(process.env.DEV_SERVER_PORT) || 3005,
    proxy: {
      '/graphql': {
        target: process.env.GRAPHQL_PROXY_TARGET || 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
      '/custom-translations': {
        target: process.env.GRAPHQL_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/files': {
        target: process.env.GRAPHQL_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
      // Sync-file store (upload/download/delete of record documents, e.g. an
      // inbound shipment's attachments) — a REST endpoint, not GraphQL.
      '/sync_files': {
        target: process.env.GRAPHQL_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}));
