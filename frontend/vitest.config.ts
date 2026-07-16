import { defineConfig } from 'vitest/config';

// Unit tests (intl, codegen helpers) run in node. UI / conformance tests that
// need the real backend live under tests/playwright.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
