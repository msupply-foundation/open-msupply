import { defineWorkspace } from 'vitest/config';
import solid from 'vite-plugin-solid';

/*
 * Three vitest projects, because the kinds of unit test need different module
 * resolution — `pnpm test` runs them all.
 *
 * - `node`: the plain logic tests (`*.test.ts`). Unchanged from vitest.config.ts.
 * - `solid`: the component tests (`*.test.tsx`). JSX needs the Solid transform,
 *   and `resolve.conditions` is the load-bearing part: without `browser` +
 *   `development`, `solid-js` resolves to its SERVER build, where signals do not
 *   track and `onMount` never runs — a no-remount test would pass vacuously.
 *   The environment stays `node`: components under test render no DOM (they
 *   return values and run effects), so nothing needs a document, and the suite
 *   costs no jsdom dependency.
 * - `backend-plugins`: the BoaJS halves of the country plugins
 *   (`plugins/<name>/backend/src`). Two differences, both about running code
 *   written for another host: the `@common` specifier resolves to the
 *   server-generated `backendCommon` (the same alias
 *   vite/backendPluginBuild.ts gives the build), and `globals: true` lets the
 *   suites keep the bare
 *   `describe`/`it`/`expect` they arrive with — these files are SYNCED from
 *   msupply-foundation/civ-plugins, so every edit made to suit this repo is an
 *   edit to redo on the next sync.
 */

const define = { APP_VERSION: JSON.stringify('0.0.0-test') };
// "@/x" → src/x — mirrors vite.config.ts / tsconfig.app.json "paths".
const alias = { '@': new URL('./src', import.meta.url).pathname };

export default defineWorkspace([
  // The node project IS the root config, referenced rather than restated.
  './vitest.config.ts',
  {
    plugins: [solid()],
    define,
    resolve: { alias, conditions: ['browser', 'development'] },
    test: {
      name: 'solid',
      include: ['src/**/*.test.tsx'],
      environment: 'node',
    },
  },
  {
    resolve: {
      alias: {
        '@common': new URL(
          '../client/packages/plugins/backendCommon',
          import.meta.url
        ).pathname,
      },
    },
    test: {
      name: 'backend-plugins',
      include: ['plugins/*/backend/src/**/*.test.ts'],
      globals: true,
      environment: 'node',
    },
  },
]);
