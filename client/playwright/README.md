# Playwright E2E Tests

In the future this folder will contain various End-to-end tests (testing frontend and backend interactively) for Open mSupply.
Currently the only test does the  custom translation import/export workflow on the central server and takes screenshots.

## Prerequisites

- Node.js >= 18
- Yarn
- A running Open mSupply instance on `http://localhost:3003` (configured in `playwright.config.ts`)

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

## Project Structure

```
playwright/
├── e2e/                        # Test specs
│   └── central-server-custom-translations.spec.ts
├── fixtures/                   # Test data
│   └── sample-translations.json
├── screenshots/                # Generated screenshots (gitignored)
├── playwright.config.ts        # Playwright configuration
└── package.json
```

## Configuration

Tests run against `http://localhost:3003` by default. To change this, edit the `baseURL` in `playwright.config.ts` or set it via the command line:

```bash
BASE_URL=http://localhost:4000 npx playwright test
```

The tests log in with `admin` / `pass` — make sure your local instance has this user configured.
