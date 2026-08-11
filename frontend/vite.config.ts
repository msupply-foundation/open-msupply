import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import solid from 'vite-plugin-solid';
import { devPluginsPlugin } from './vite/devPlugins.ts';
import { sharedModulesPlugin } from './vite/sharedModules.ts';

/*
 * Dev server proxies GraphQL + custom translations to the mSupply backend
 * (default :8000; the auth-flow tests rely on 3005 → 8000). Override with
 * DEV_SERVER_PORT / GRAPHQL_PROXY_TARGET — in the shell, or per checkout in
 * a gitignored `.env.local` (several checkouts run dev servers concurrently;
 * Vite's default port is first-come-first-served with silent fallback, so
 * without a lock each checkout's port is effectively random). An EXPLICIT
 * port is strict: taken = fail loudly, never drift to the next free one.
 * LANG_VERSION busts the cached translation dictionaries on a new production
 * build (src/intl/dictionaryCache); dev uses a fixed token so the cache is
 * stable across reloads.
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

// GraphQL + REST endpoints proxied to the mSupply backend — the same set the
// deploy nginx configs proxy (deploy/README.md; read them off App::new()'s
// .configure(config_*) in server/server/src/lib.rs), so the dev and deployed
// proxies stay in step and a missing path never surfaces as the SPA fallback
// answering an API call with index.html. `preview` gets the same map so the
// plugin production path (import map + installed bundles under
// /frontend_plugins) can be exercised against a running server.
const backendProxy = (proxyTarget: string) => ({
  '/graphql': { target: proxyTarget, ws: true, changeOrigin: true },
  '/custom-translations': { target: 'https://faster-oms.msupply.org:8000', changeOrigin: true },
  '/files': { target: proxyTarget, changeOrigin: true },
  // Sync-file store (upload/download/delete of record documents, e.g. an
  // inbound shipment's attachments) — a REST endpoint, not GraphQL.
  '/sync_files': { target: 'https://faster-oms.msupply.org:8000', changeOrigin: true },
  // Dispensing-label printing (prescriptions) — a REST endpoint.
  '/print': { target: 'https://faster-oms.msupply.org:8000', changeOrigin: true },
  // Staged report/plugin upload (POST /upload → {file_id}).
  '/upload': { target: 'https://faster-oms.msupply.org:8000', changeOrigin: true },
  // Plugin JS bundles served out of the datafile.
  '/frontend_plugins': { target: 'https://faster-oms.msupply.org:8000', changeOrigin: true },
  // Berlinger fridge-tag / Q-tag sensor log import (cold chain).
  '/fridge-tag': { target: 'https://faster-oms.msupply.org:8000', changeOrigin: true },
  // Cold Chain mobile-app API.
  '/coldchain': { target: 'https://faster-oms.msupply.org:8000', changeOrigin: true },
  // Support tools.
  '/support': { target: 'https://faster-oms.msupply.org:8000', changeOrigin: true },
});

export default defineConfig(({ mode }) => {
  // .env / .env.local values (all keys, not just VITE_-prefixed); a real
  // shell variable still wins over the file.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const lockedPort = env.DEV_SERVER_PORT;
  const proxyTarget = env.GRAPHQL_PROXY_TARGET || 'https://faster-oms.msupply.org:8000';
  return {
    // devPluginsPlugin is the author dev loop (vite/devPlugins.ts): it only
    // enumerates plugin sources when SERVING — in a build it resolves its
    // virtual module to an empty map, which is dead code the DEV branch in
    // src/plugins/loader.ts treeshakes away, so build output is unaffected.
    plugins: [solid(), sharedModulesPlugin(), devPluginsPlugin()],
    // "@/x" → src/x. Keep in sync with tsconfig.app.json "paths" and
    // vitest.config.ts (the showcase config inherits it via mergeConfig).
    // "@openmsupply/plugin-sdk" resolves the SDK from source so in-tree code
    // and source-loaded dev plugins share the app's live instance.
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
        '@openmsupply/plugin-sdk': new URL(
          './src/plugin-sdk/index.ts',
          import.meta.url
        ).pathname,
      },
      // One Solid runtime, always — a duplicated copy breaks reactivity
      // silently (kdd/plugin-loading).
      dedupe: ['solid-js'],
    },
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
      port: Number(lockedPort) || 3005,
      // A chosen port never silently drifts; only the unconfigured default
      // keeps Vite's find-a-free-port behaviour.
      strictPort: Boolean(lockedPort),
      proxy: backendProxy(proxyTarget),
    },
    preview: {
      proxy: backendProxy(proxyTarget),
    },
  };
});
