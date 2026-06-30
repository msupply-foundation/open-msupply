import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

const authFile = path.join(__dirname, '.auth/state.json');

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // `html` for humans; `json` so the coverage-map generator can read each
  // test's `covers` annotations alongside its pass/skip/fail status.
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3003',
    trace: 'on-first-retry',
  },

  projects: [
    // Login once before all other tests
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Main tests - run after setup, reuse auth state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
  ],
});

export { authFile };
