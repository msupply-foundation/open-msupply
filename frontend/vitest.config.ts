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
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
