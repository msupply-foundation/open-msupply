import { defineConfig, devices } from '@playwright/test';

/**
 * Config for running the regression suites against the greenfield "Thin React"
 * FE on :3100 (esmehm/rnd-the-fe#1). That prototype has NO auth (backend runs
 * debug_no_access_control) and is stocktake-only, so unlike the main config
 * there is no `setup` login project and no stored auth state — tests hit the
 * app directly. Used to build the cross-FE pass/fail matrix.
 *
 *   BASE_URL=http://localhost:3100 npx playwright test \
 *     --config=playwright.3100.config.ts stocktake-regression
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['line'], ['json', { outputFile: 'playwright-report/results-3100.json' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-3100',
      use: { ...devices['Desktop Chrome'] },
      // No `dependencies: ['setup']` and no storageState — the prototype needs
      // no login.
      testIgnore: /auth\.setup\.ts/,
    },
  ],
});
