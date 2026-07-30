import { defineConfig, devices } from '@playwright/test';

/**
 * Perf harness config. Deliberately NOT the e2e config:
 *  - one worker, no parallelism — concurrent tests contend for CPU and the
 *    numbers stop meaning anything (CHARTER.md §3)
 *  - no retries — a retried perf run is a different run, not the same one
 *  - long timeouts, because 6× CPU throttle is the point
 */
export default defineConfig({
  testDir: './scenarios',
  testMatch: /.*\.perf\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60 * 60 * 1000,
  // Without this, Playwright actions wait forever: a selector that never
  // becomes clickable hangs the whole suite with no output instead of failing.
  expect: { timeout: 30_000 },
  reporter: [['list']],
  // Keep Playwright's failure artifacts inside the already-ignored results/ dir
  // rather than creating an untracked client/test-results/ next to the packages.
  outputDir: './results/test-artifacts',
  use: {
    actionTimeout: 30_000,
    baseURL: process.env.BASE_URL ?? 'http://localhost:3003',
    // A fixed viewport keeps row counts (and therefore render cost) constant
    // between runs. Tablet-ish landscape, matching the deployment target.
    viewport: { width: 1280, height: 900 },
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'perf',
      use: {
        ...devices['Desktop Chrome'],
        // Real Chrome, not the bundled chromium-headless-shell: the shell has no
        // proper compositor, and Event Timing `duration` is defined against an
        // actual paint. Also decouples us from Playwright's browser-build pinning.
        // The version is recorded in each report for provenance.
        channel: 'chrome',
        headless: !process.env.PERF_HEADED,
      },
    },
  ],
});
