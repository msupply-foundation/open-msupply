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

// The displayed app version (spec/startup/rules.md § App version). Plain
// production builds show the bare package version. A short build stamp is
// appended ("0.0.1 (2ae7bd2)") when BUILD_SHA is set — deploy-demo.yml sets it
// so the nightly demo deploys (regenerated spec-build branches, package.json
// frozen) stay identifiable — or automatically in dev, from the git checkout.
const appVersion = (mode: string): string => {
  const { version } = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8')
  ) as { version: string };
  let sha = process.env.BUILD_SHA?.trim() ?? '';
  if (!sha && mode !== 'production') {
    try {
      sha = execSync('git rev-parse --short HEAD', {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
    } catch {
      // not a git checkout — bare version
    }
  }
  return sha ? `${version} (${sha})` : version;
};

export default defineConfig(({ mode }) => ({
  plugins: [solid()],
  define: {
    LANG_VERSION: JSON.stringify(
      mode === 'production' ? String(Date.now()) : 'dev'
    ),
    APP_VERSION: JSON.stringify(appVersion(mode)),
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
    },
  },
}));
