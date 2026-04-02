# Playwright E2E Tests

## About Playwright

[Playwright](https://playwright.dev) is an open-source end-to-end testing framework by Microsoft. It supports testing across Chromium, Firefox, and WebKit browsers, and can run tests headlessly or with a visible browser. Key capabilities include:

- **Cross-browser testing** — run the same tests across all major browsers
- **Auto-waiting** — automatically waits for elements to be ready before interacting
- **Screenshots & videos** — capture screenshots or record video on test failure
- **Network interception** — mock or inspect API requests during tests
- **Parallel execution** — run tests concurrently to reduce overall run time

For full documentation, see [playwright.dev](https://playwright.dev).

## Prerequisites

- Node.js >= 18
- Yarn
- A running Open mSupply instance (defaults to `http://localhost:3003`)

## Setup

```bash
cd client

# Install Playwright browsers (first time only)
npx playwright install chromium
```

## Running Tests

All commands run from the `client/` directory.

```bash
# Run all tests (headless)
yarn e2e

# Run only the smoke tests
yarn e2e smoke

# Run with visible browser, single worker (easier to watch)
yarn e2e --headed smoke --workers 1

# Run a specific section
yarn e2e -g "Replenishment"

# Interactive UI mode
yarn e2e --ui smoke

# Against a different server
BASE_URL=http://localhost:9000 yarn e2e --headed smoke

# View the HTML report from the last run
npx playwright show-report playwright/playwright-report
```

## Auth

Tests log in once at the start of each run using `admin` / `pass` and share the session across all workers via a stored auth state file (`.auth/state.json`, gitignored). Individual tests don't need to log in.

## Smoke Tests

The smoke test suite (`smoke-all-sections.spec.ts`) covers:

- **Dashboard**
- **Distribution** — outbound shipments, customer returns, customers
- **Replenishment** — inbound shipments, purchase orders, internal orders, supplier returns, suppliers, R&R forms
- **Inventory** — stock, stocktakes, locations
- **Catalogue** — items, master lists, assets
- **Dispensary** — patients, prescriptions, clinicians
- **Cold Chain** — equipment, monitoring, sensors
- **Manage (Central Server)** — facilities, global preferences, equipment, indicators & demographics, campaigns
- **Programs** — immunisations
- **Reports & Settings**

Each section runs in parallel across Playwright workers. Tests within a section run sequentially (list view, then detail view + tabs). Sections that aren't available for the current store (e.g. central-only pages, dispensary mode) will pass without asserting content.

## Project Structure

```
playwright/
├── e2e/
│   ├── auth.setup.ts                           # Shared login (runs once per test run)
│   ├── smoke-all-sections.spec.ts              # Smoke tests for all sections
│   └── central-server-custom-translations.spec.ts
├── helpers/
│   └── login.ts                                # Login helper
├── fixtures/                                   # Test data
│   └── sample-translations.json
├── screenshots/                                # Generated screenshots (gitignored)
├── .auth/                                      # Stored auth state (gitignored)
├── playwright.config.ts
└── package.json
```
