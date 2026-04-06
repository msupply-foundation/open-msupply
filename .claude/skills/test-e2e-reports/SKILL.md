---
name: test-e2e-reports
description: Run Playwright e2e tests for standard reports against a running Open mSupply instance
---

Read the skill documentation at standard_reports/e2e/README.md then run the Playwright e2e tests for standard reports.

Before running, ensure:
1. An Open mSupply instance is running (default: http://localhost:3003)
2. Dependencies are installed: `cd standard_reports/e2e && yarn install`
3. Chromium is installed: `npx playwright install chromium`

Run tests with: `cd standard_reports/e2e && yarn test`

Check the Playwright HTML report with `yarn report` if there are failures.
