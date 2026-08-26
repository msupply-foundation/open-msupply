import { defineConfig } from 'vitest/config';

// Unit tests (intl, codegen helpers) run in node. The deterministic e2e
// suites that need the real backend live under e2e/ (Playwright, not vitest).
export default defineConfig({
  // Mirror vite.config.ts's APP_VERSION define so a test can import a module
  // that renders it without a ReferenceError. LANG_VERSION is deliberately NOT
  // defined here: dictionaryCache.test.ts stubs it per-test (vi.stubGlobal),
  // which a transform-time define would silence.
  define: {
    APP_VERSION: JSON.stringify('0.0.0-test'),
  },
  // "@/x" → src/x — mirrors vite.config.ts / tsconfig.app.json "paths".
  // "@openmsupply/plugin-sdk" mirrors vite.config.ts / tsconfig.plugins.json,
  // so an in-repo plugin's own unit tests resolve the SDK the same way its
  // build does.
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@openmsupply/plugin-sdk': new URL(
        './src/plugin-sdk/index.ts',
        import.meta.url
      ).pathname,
    },
    // Resolve solid-js (and solid-consuming deps) to the CLIENT build — the
    // one that ships — not the node-default server build, whose createResource
    // refuses to run outside a hydration context. Without this, no test can
    // construct a resource (storeScopedResource.test.ts), and solid-js and
    // @tanstack/solid-table resolve as two disconnected instances (the
    // limitation renderTemplate.test.tsx documents).
    conditions: ['browser'],
  },
  test: {
    // The in-repo country plugins are covered too — co-locating them buys
    // nothing if CI doesn't run their tests.
    include: [
      'src/**/*.test.ts',
      'vite/**/*.test.ts',
      'plugins/*/src/**/*.test.ts',
    ],
    environment: 'node',
  },
});
