+++
title = "Playwright E2E Tests"
weight = 10
sort_by = "weight"
template = "docs/section.html"
+++

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
