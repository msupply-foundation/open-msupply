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

// The displayed build version (spec/startup/rules.md § App version): the
// front end's own auto-incrementing v* release line, decoupled from the
// server's version (the two-repo plan, #401 — the canonical application
// version stays the server's and shows on its own footer line). A release
// build gets the pipeline-minted next tag via RELEASE_VERSION with the short
// SHA appended ("v0.0.82 (2ae7bd2)"); any other checkout build shows where it
// sits relative to the latest release via git describe
// ("v0.0.81-5-g89ccd1b5"). Only a checkout-less build (tarball/export) falls
// back to the bare — deliberately meaningless — package version.
const appVersion = (): string => {
  const git = (args: string): string => {
    try {
      return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
    } catch {
      return ''; // not a git checkout
    }
  };
  const release = process.env.RELEASE_VERSION;
  if (release) {
    const sha = git('rev-parse --short HEAD');
    return sha ? `${release} (${sha})` : release;
  }
  const described = git('describe --tags --always');
  if (described) return described;
  const { version } = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8')
  ) as { version: string };
  return version;
};

export default defineConfig(({ mode }) => ({
  plugins: [solid()],
  // Lets the same build be mounted at a non-root path (the component
  // showcase's /showcase/ track, deploy/build-and-deploy.sh) — Vite rewrites
  // every asset reference to match and exposes it at runtime as
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
      // Dispensing-label printing (prescriptions) — a REST endpoint.
      '/print': {
        target: process.env.GRAPHQL_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}));
