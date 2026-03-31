# Standard Reports E2E Tests

Playwright end-to-end tests for Open mSupply standard reports.

## Prerequisites

- Node.js >= 18
- Yarn
- A running Open mSupply instance with demo data
- Playwright browsers installed (`npx playwright install chromium`)

## Setup

```bash
cd standard_reports/e2e
yarn install
npx playwright install chromium
```

## Running Tests

```bash
# Run all report tests
yarn test

# Run only the common tests (all 9 reports × 7 tests each)
yarn test specs/all-reports-common.spec.ts

# Run tests for a single report
yarn test specs/stock-detail.spec.ts

# Filter by report name
yarn test --grep "Expiring Items"

# Run with a visible browser
yarn test:headed

# Interactive UI mode
yarn test:ui

# View HTML report from last run
yarn report

# Point at a different server
BASE_URL=http://localhost:4000 yarn test
```

## Project Structure

```
e2e/
├── specs/                              # Test specs
│   ├── all-reports-common.spec.ts      # Shared tests for all 9 reports
│   ├── stock-detail.spec.ts            # Report-specific filter tests
│   ├── stock-status.spec.ts
│   ├── expiring-items.spec.ts
│   ├── inventory-adjustments.spec.ts
│   ├── item-list.spec.ts
│   ├── item-usage.spec.ts
│   ├── outbound-shipments.spec.ts
│   ├── inbound-shipments.spec.ts
│   └── pending-encounters.spec.ts
├── pages/                              # Page Object Models
│   ├── reports-list.page.ts            # /reports list view
│   ├── report-arguments-modal.page.ts  # Filter arguments dialog
│   └── report-detail.page.ts           # /reports/:id detail view
├── data/                               # Test data and configuration
│   ├── report-definitions.ts           # Registry of all standard reports
│   └── filter-strategies.ts            # Per-report filter strategies
├── fixtures/
│   └── report-test.fixture.ts          # Custom fixture (login + page objects)
├── helpers/
│   └── login.ts                        # Login helper
├── playwright.config.ts
└── package.json
```

## How it works

1. **Report Registry** (`data/report-definitions.ts`) — defines all 9 reports with metadata
2. **Common spec** (`all-reports-common.spec.ts`) — loops over the registry, runs 7 tests per report:
   - Appears in the reports list under correct category
   - Opens filter modal when clicked
   - Cancel closes modal without navigating
   - Generates report with default filters (iframe loads)
   - Filter button on detail view reopens modal
   - Print button triggers report generation request
   - Export button triggers file download
3. **Report-specific specs** — test individual filter fields and interactions
4. **Filter strategies** (`data/filter-strategies.ts`) — optional per-report overrides for how common tests fill the filter modal

## Adding a new report

**Step 1:** Register the report in `data/report-definitions.ts`:

```typescript
{
  code: 'my-new-report',
  displayName: 'My New Report',
  category: 'Stock & Items',
  hasArguments: true,
  subContext: 'StockAndItems',
},
```

This gives you 7 common tests automatically.

**Step 2 (optional):** Add a filter strategy override in `data/filter-strategies.ts` if the common tests need custom filter values:

```typescript
export const reportFilterStrategies: Record<string, FilterStrategy> = {
  'my-new-report': async (modal) => {
    await modal.fillTextInput('Required Field', 'some value');
  },
};
```

**Step 3 (optional):** Create a report-specific spec at `specs/my-new-report.spec.ts`:

```typescript
import { test } from '../fixtures/report-test.fixture';

test.describe('My New Report — report-specific filters', () => {
  test.beforeEach(async ({ reportsListPage }) => {
    await reportsListPage.goto();
    await reportsListPage.expectPageLoaded();
    await reportsListPage.clickReport('My New Report');
  });

  test('displays expected filter fields', async ({ reportArgumentsModal }) => {
    await reportArgumentsModal.expectOpen();
    await reportArgumentsModal.expectFieldVisible('Some Filter');
  });

  test('filters by some field', async ({ reportArgumentsModal, reportDetailPage }) => {
    await reportArgumentsModal.expectOpen();
    await reportArgumentsModal.fillTextInput('Some Filter', 'test value');
    await reportArgumentsModal.clickOk();
    await reportDetailPage.waitForReportLoaded();
    await reportDetailPage.expectReportRendered();
  });
});
```
