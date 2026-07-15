import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '.auth/state.json');

// Provenance stamped into the report: the HTML report / results.json get
// downloaded and shared as regression evidence, so they must say what was
// tested even once detached from the workflow run. In CI the checkout is a
// detached merge commit, so branch/PR/head-SHA come from the workflow env
// (see e2e-regression.yaml); git is the fallback for local runs.
const env = (name: string) => process.env[name] || undefined;
const git = (cmd: string): string | undefined => {
  try {
    return execSync(cmd, { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
};

const omsVersion: string = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
).version;
const commit = env('E2E_META_SHA') ?? git('git rev-parse HEAD');
const branch = env('E2E_META_BRANCH') ?? git('git rev-parse --abbrev-ref HEAD');
const pr = env('E2E_META_PR');

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
  // Shown in the HTML report header and embedded in results.json.
  metadata: {
    'OMS version': omsVersion,
    ...(commit ? { commit } : {}),
    ...(branch ? { branch } : {}),
    ...(pr ? { PR: `#${pr}` } : {}),
  },
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
    // Main tests - run after setup, reuse auth state. (The deterministic
    // regression suites — and their data.setup arrange step — live in
    // open-msupply-frontend/e2e now; this config only runs the specs left
    // here: smoke + custom translations.)
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
