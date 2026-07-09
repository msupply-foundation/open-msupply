# Playwright E2E Tests

- **Docs site**: https://dev-docs.msupply.foundation/client/playwright/
- **Source**: [docs/content/client/playwright/_index.md](../../docs/content/client/playwright/_index.md)

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
- A running Open mSupply instance (defaults to `http://localhost:3003`) — **or
  nothing at all** if you use the hermetic runner below, which boots its own.

## Setup

```bash
cd client

# Install Playwright browsers (first time only)
npx playwright install chromium
```

## Hermetic run (recommended) — no setup, deterministic data

One command builds the (sqlite) server, restores a throwaway database from the
committed reference datafile ([server/data/e2e](../../server/data/e2e/README.md)),
boots server + front end on dedicated ports, runs the tests, and tears
everything down. No postgres, no central server, no datafile of your own:

```bash
cd client
yarn e2e:local stocktake-regression            # one suite
yarn e2e:local                                 # everything
yarn e2e:local stocktake-regression --headed   # watch it
KEEP_SERVER=1 yarn e2e:local stocktake-regression   # leave the stack up to poke at
```

First run compiles the Rust server (slow); after that the whole cycle is a few
minutes. Every run starts from identical data — this is the same shape CI uses,
so "passes locally" means something.

Two rules keep it deterministic:

- **Suites must not assume datafile state.** Store-local data (stock, documents)
  is arranged through the GraphQL API in [e2e/data.setup.ts](e2e/data.setup.ts)
  — extend that, don't add rows to the reference datafile.
- **Reference data (items, reasons, master lists) lives in the datafile.** The
  remote API can't create it; see the
  [regeneration recipe](../../server/data/e2e/README.md) when it needs to change.

## Running Tests (against your own instance)

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

## Configuration (environment variables)

All optional — sensible defaults are baked in, so `yarn e2e` works out of the box against a stock local instance. Override them for a different port, login, or run mode.

| Variable | Default | Purpose |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3003` | URL of the running Open mSupply front end |
| `PW_USERNAME` | `admin` | Login user (used by `auth.setup.ts` and the "Entered by" check in the distribution suite) |
| `PW_PASSWORD` | `pass` | Login password |
| `PW_MODE` | `serial` | Describe-block mode for `distribution-regression.spec.ts`: `serial`, `parallel`, or `default`. **Serial is recommended** — parallel currently produces false failures because these tests share the shipment list. |

Three ways to pass them (nothing auto-loads a file — the config just reads `process.env`):

```bash
# 1. Inline, for a single run (from client/)
PW_USERNAME=check BASE_URL=http://localhost:3006 yarn e2e distribution-regression

# 2. export once per shell session
export PW_USERNAME=check PW_PASSWORD=pass BASE_URL=http://localhost:3006
yarn e2e distribution-regression

# 3. Keep your values in a gitignored playwright/.env and source it (from client/)
set -a && source playwright/.env && set +a
yarn e2e distribution-regression
```

## Auth

Tests log in once at the start of each run (default `admin` / `pass`, override with `PW_USERNAME` / `PW_PASSWORD`) and share the session across all workers via a stored auth state file (`.auth/state.json`, gitignored). Individual tests don't need to log in.

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
