import { defineConfig } from 'vitest/config';

// Unit tests (intl, codegen helpers) run in node. The deterministic e2e
// suites that need the real backend live under e2e/ (Playwright, not vitest).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
