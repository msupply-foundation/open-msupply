# Playwright E2E Tests

## About Playwright

[Playwright](https://playwright.dev) is an open-source end-to-end testing framework by Microsoft. It supports testing across Chromium, Firefox, and WebKit browsers, and can run tests headlessly or with a visible browser. Key capabilities include:

- **Cross-browser testing** — run the same tests across all major browsers
- **Auto-waiting** — automatically waits for elements to be ready before interacting
- **Screenshots & videos** — capture screenshots or record video on test failure
- **Network interception** — mock or inspect API requests during tests
- **Parallel execution** — run tests concurrently to reduce overall run time

For full documentation, see [playwright.dev](https://playwright.dev).

## Overview

This folder contains End-to-end tests for Open mSupply, including:

- **Standard Reports** — a parameterized framework that tests all 9 standard reports
- **Custom Translations** — tests the translation import/export workflow on the central server

## Prerequisites

- Node.js >= 18
- Yarn
- A running Open mSupply instance on `http://localhost:3003` (configured in `playwright.config.ts`)
- The instance should have demo data loaded and the `admin` / `pass` user configured

## Setup

```bash
cd client/playwright

# Install dependencies
yarn install

# Install Playwright browsers (first time only)
npx playwright install chromium
```

## Running Tests

```bash
# Run all tests (headless)
yarn test

# Run tests with a visible browser
yarn test:headed

# Run tests in interactive UI mode
yarn test:ui

# View the HTML report from the last run
yarn report
```

### Running Report Tests

```bash
# Run all report tests (common + report-specific)
yarn test e2e/reports/

# Run only the common tests (all 9 reports × 7 tests each)
yarn test e2e/reports/all-reports-common.spec.ts

# Run tests for a single report
yarn test e2e/reports/stock-detail.spec.ts

# Filter by report name
yarn test e2e/reports/ --grep "Expiring Items"

```

## Project Structure

```
playwright/
├── e2e/                                # Test specs
│   ├── central-server-custom-translations.spec.ts
│   └── reports/
│       ├── all-reports-common.spec.ts  # Shared tests for all 9 reports
│       ├── stock-detail.spec.ts        # Report-specific filter tests
│       ├── stock-status.spec.ts
│       ├── expiring-items.spec.ts
│       ├── inventory-adjustments.spec.ts
│       ├── item-list.spec.ts
│       ├── item-usage.spec.ts
│       ├── outbound-shipments.spec.ts
│       ├── inbound-shipments.spec.ts
│       └── pending-encounters.spec.ts
├── pages/                              # Page Object Models
│   ├── reports-list.page.ts            # /reports list view
│   ├── report-arguments-modal.page.ts  # Filter arguments dialog
│   └── report-detail.page.ts          # /reports/:id detail view
├── data/                               # Test data and configuration
│   ├── report-definitions.ts           # Registry of all standard reports
│   └── filter-strategies.ts            # Per-report filter strategies
├── fixtures/                           # Test fixtures
│   ├── report-test.fixture.ts          # Custom fixture (login + page objects)
│   └── sample-translations.json
├── helpers/
│   └── login.ts                        # Login helper
├── screenshots/                        # Generated screenshots (gitignored)
├── playwright.config.ts
└── package.json
```

## Report Test Framework

The report tests use a data-driven approach: a single registry of reports drives parameterized tests that cover common functionality, while per-report spec files test filter-specific behaviour.

### How it works

1. **Report Registry** (`data/report-definitions.ts`) — defines all 9 reports with metadata (code, name, category)
2. **Common spec** (`all-reports-common.spec.ts`) — loops over the registry and runs 7 tests per report:
   - Appears in the reports list under correct category
   - Opens filter modal when clicked
   - Cancel closes modal without navigating
   - Generates report with default filters (iframe loads)
   - Filter button on detail view reopens modal
   - Print button triggers report generation request
   - Export button triggers file download
3. **Report-specific specs** — test individual filter fields and interactions
4. **Filter strategies** (`data/filter-strategies.ts`) — optional per-report overrides for how the common tests fill the filter modal

### Adding a new report to test 

**Step 1:** Register the report in `data/report-definitions.ts`:

```typescript
// In the STANDARD_REPORTS array, add:
{
  code: 'my-new-report',
  displayName: 'My New Report',
  category: 'Stock & Items',
  hasArguments: true,
  subContext: 'StockAndItems',
},
```

This alone gives you 7 common tests for the new report automatically.

**Step 2 (optional):** Add a filter strategy if the common tests need custom filter values to generate the report successfully (e.g., a required field):

```typescript
// In data/filter-strategies.ts, add to reportFilterStrategies:
export const reportFilterStrategies: Record<string, FilterStrategy> = {
  'my-new-report': async (modal) => {
    // Fill in a required field before clicking OK
    await modal.fillTextInput('Required Field', 'some value');
  },
};
```

**Step 3 (optional):** Create a report-specific test file for filter-level testing at `e2e/reports/my-new-report.spec.ts`:

```typescript
import { test } from '../../fixtures/report-test.fixture';

test.describe('My New Report — report-specific filters', () => {
  test.beforeEach(async ({ reportsListPage }) => {
    await reportsListPage.goto();
    await reportsListPage.expectPageLoaded();
    await reportsListPage.clickReport('My New Report');
  });

  test('displays expected filter fields', async ({
    reportArgumentsModal,
  }) => {
    await reportArgumentsModal.expectOpen();
    await reportArgumentsModal.expectFieldVisible('Some Filter');
    await reportArgumentsModal.expectFieldVisible('Another Filter');
  });

  test('filters by some field', async ({
    reportArgumentsModal,
    reportDetailPage,
  }) => {
    await reportArgumentsModal.expectOpen();
    await reportArgumentsModal.fillTextInput('Some Filter', 'test value');
    await reportArgumentsModal.clickOk();
    await reportDetailPage.waitForReportLoaded();
    await reportDetailPage.expectReportRendered();
  });
});
```

## Configuration

Tests run against `http://localhost:3003` by default. To change this, set the `BASE_URL` environment variable:

```bash
BASE_URL=http://localhost:4000 yarn test
```

The tests log in with `admin` / `pass` — make sure your local instance has this user configured.
