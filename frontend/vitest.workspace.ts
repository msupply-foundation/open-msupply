import { defineWorkspace } from 'vitest/config';
import solid from 'vite-plugin-solid';

/*
 * Two vitest projects, because the two kinds of unit test need different module
 * resolution — `pnpm test` runs both.
 *
 * - `node`: the plain logic tests (`*.test.ts`). Unchanged from vitest.config.ts.
 * - `solid`: the component tests (`*.test.tsx`). JSX needs the Solid transform,
 *   and `resolve.conditions` is the load-bearing part: without `browser` +
 *   `development`, `solid-js` resolves to its SERVER build, where signals do not
 *   track and `onMount` never runs — a no-remount test would pass vacuously.
 *   The environment stays `node`: components under test render no DOM (they
 *   return values and run effects), so nothing needs a document, and the suite
 *   costs no jsdom dependency.
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
]);
