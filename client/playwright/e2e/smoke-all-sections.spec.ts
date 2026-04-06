/**
 * Smoke tests: Navigate through all main sections, list views, and detail views
 * to check for infinite renders, runtime errors, and crashes.
 *
 * Each section runs as its own serial describe so sections run in parallel
 * across workers, but tests within a section run sequentially (sharing a page).
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { InboundShipmentDetailTabs } from '../../packages/invoices/src/InboundShipment/DetailView/types';

const screenshotDir = path.join(__dirname, '../screenshots/smoke');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

interface ErrorTracker {
  errors: string[];
  hasInfiniteLoop: boolean;
}

function setupErrorTracking(page: Page): ErrorTracker {
  const tracker: ErrorTracker = { errors: [], hasInfiniteLoop: false };
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      tracker.errors.push(text);
      if (
        text.includes('Maximum update depth exceeded') ||
        text.includes('Too many re-renders')
      ) {
        tracker.hasInfiniteLoop = true;
      }
    }
  });
  page.on('pageerror', err => {
    tracker.errors.push(err.message);
  });
  return tracker;
}

function resetTracker(tracker: ErrorTracker) {
  tracker.errors = [];
  tracker.hasInfiniteLoop = false;
}

// Brief pause to let React hit an infinite loop if one exists.
// Infinite loops fire errors within ~50ms, so 300ms is plenty.
const RENDER_SETTLE_MS = 300;

function reportErrors(tracker: ErrorTracker, label: string) {
  const runtimeErrors = tracker.errors.filter(
    e =>
      !e.includes('Menu component') &&
      !e.includes('validateDOMNesting') &&
      !e.includes('404') &&
      !e.includes('Failed to fetch')
  );
  if (runtimeErrors.length > 0) {
    console.log(`  ERRORS in ${label}:`);
    runtimeErrors
      .slice(0, 3)
      .forEach(e => console.log(`    ${e.substring(0, 200)}`));
  }
  if (tracker.hasInfiniteLoop) {
    console.log(`  !!! INFINITE LOOP in ${label}`);
  }
}

async function navigateAndCheck(
  page: Page,
  tracker: ErrorTracker,
  url: string,
  label: string
) {
  resetTracker(tracker);
  await page
    .goto(url, { waitUntil: 'networkidle', timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(RENDER_SETTLE_MS);

  const safeName = label.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  await page.screenshot({ path: path.join(screenshotDir, `${safeName}.png`) });

  reportErrors(tracker, label);
  expect.soft(tracker.hasInfiniteLoop, `Infinite loop in ${label}`).toBe(false);
}

async function clickFirstRowAndCheck(
  page: Page,
  tracker: ErrorTracker,
  label: string
): Promise<boolean> {
  resetTracker(tracker);

  const row = page.locator('tbody tr').first();
  if (!(await row.isVisible({ timeout: 3000 }).catch(() => false))) {
    console.log(`  No rows in ${label}, skipping detail`);
    return false;
  }

  // Dismiss any open MUI dialog that may intercept clicks
  const dialog = page.locator('.MuiDialog-root');
  if (await dialog.isVisible({ timeout: 500 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }

  await row.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(RENDER_SETTLE_MS);

  const safeName = label.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  await page.screenshot({
    path: path.join(screenshotDir, `${safeName}-detail.png`),
  });

  reportErrors(tracker, `${label} detail`);
  expect
    .soft(tracker.hasInfiniteLoop, `Infinite loop in ${label} detail`)
    .toBe(false);
  return true;
}

async function clickTabsAndCheck(
  page: Page,
  tracker: ErrorTracker,
  label: string
) {
  const tabs = page.getByRole('tab');
  const tabCount = await tabs.count();

  for (let i = 0; i < tabCount; i++) {
    const tab = tabs.nth(i);
    const tabName = (await tab.textContent()) ?? `tab-${i}`;

    resetTracker(tracker);
    await tab.click();
    await page.waitForTimeout(RENDER_SETTLE_MS);

    const safeName = `${label}-tab-${tabName}`
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();
    await page.screenshot({
      path: path.join(screenshotDir, `${safeName}.png`),
    });

    reportErrors(tracker, `${label} > ${tabName}`);
    expect
      .soft(
        tracker.hasInfiniteLoop,
        `Infinite loop in ${label} tab "${tabName}"`
      )
      .toBe(false);
  }
}

// Helper to create a section test suite with shared page
function sectionSuite(
  name: string,
  routes: { label: string; url: string; hasDetail?: boolean }[]
) {
  test.describe(name, () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let context: BrowserContext;
    let tracker: ErrorTracker;

    test.beforeAll(async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      tracker = setupErrorTracking(page);
    });

    test.afterAll(async () => {
      await context?.close();
    });

    for (const route of routes) {
      test(`${route.label} list`, async () => {
        await navigateAndCheck(page, tracker, route.url, route.label);
      });

      if (route.hasDetail) {
        test(`${route.label} detail + tabs`, async () => {
          if (await clickFirstRowAndCheck(page, tracker, route.label)) {
            await clickTabsAndCheck(page, tracker, route.label);
            await page.goBack();
          }
        });
      }
    }
  });
}

// Helper to test specific tabs on a detail view found via the list's API response
function detailTabSuite(
  name: string,
  listUrl: string,
  detailPath: string,
  findId: (data: any) => string | undefined,
  tabs: { label: string; tab: string }[]
) {
  test.describe(name, () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let context: BrowserContext;
    let tracker: ErrorTracker;
    let detailUrl: string;

    test.beforeAll(async ({ browser }) => {
      context = await browser.newContext();
      page = await context.newPage();
      tracker = setupErrorTracking(page);

      // Navigate to the list and intercept the app's GraphQL response
      const responsePromise = page.waitForResponse(r =>
        r.url().includes('/graphql')
      );
      await page
        .goto(listUrl, { waitUntil: 'networkidle', timeout: 15000 })
        .catch(() => {});
      const response = await responsePromise;
      const data = await response.json();

      const id = findId(data);
      if (id) {
        detailUrl = `${detailPath}/${id}`;
      } else {
        console.log(`  No matching row found in ${listUrl}, skipping ${name}`);
      }
    });

    test.afterAll(async () => {
      await context?.close();
    });

    for (const { label, tab } of tabs) {
      test(label, async () => {
        test.skip(!detailUrl, `No matching row found in ${listUrl}`);
        await navigateAndCheck(
          page,
          tracker,
          `${detailUrl}?tab=${tab}`,
          `${name}-${tab}`
        );
      });
    }
  });
}

// ─── Sections ─────────────────────────────────────────────────────────────────

sectionSuite('Dashboard', [{ label: 'dashboard', url: '/dashboard' }]);

sectionSuite('Distribution', [
  {
    label: 'outbound-shipment',
    url: '/distribution/outbound-shipment',
    hasDetail: true,
  },
  {
    label: 'customer-return',
    url: '/distribution/customer-return',
    hasDetail: true,
  },
  { label: 'customers', url: '/distribution/customers' },
]);

sectionSuite('Replenishment', [
  { label: 'inbound-shipment', url: '/replenishment/inbound-shipment' },
  {
    label: 'purchase-order',
    url: '/replenishment/purchase-order',
    hasDetail: true,
  },
  {
    label: 'internal-order',
    url: '/replenishment/internal-order',
    hasDetail: true,
  },
  {
    label: 'supplier-return',
    url: '/replenishment/supplier-return',
    hasDetail: true,
  },
  { label: 'suppliers', url: '/replenishment/suppliers' },
  {
    label: 'r-and-r-forms',
    url: '/replenishment/r-and-r-forms',
    hasDetail: true,
  },
]);

const { Details, Documents, Log, Financial, Currency, Delivery } =
  InboundShipmentDetailTabs;

detailTabSuite(
  'Inbound Shipment Tabs',
  '/replenishment/inbound-shipment',
  '/replenishment/inbound-shipment-external',
  data => {
    const nodes = data.data?.invoices?.nodes ?? [];
    return nodes.find((n: any) => n.purchaseOrder)?.id;
  },
  [
    { label: 'shared: details', tab: Details },
    { label: 'shared: documents', tab: Documents },
    { label: 'shared: log', tab: Log },
    { label: 'external: financial', tab: Financial },
    { label: 'external: currency', tab: Currency },
    { label: 'external: delivery', tab: Delivery },
  ]
);

sectionSuite('Inventory', [
  { label: 'stock', url: '/inventory/stock', hasDetail: true },
  { label: 'stocktakes', url: '/inventory/stocktakes', hasDetail: true },
  { label: 'locations', url: '/inventory/locations' },
]);

sectionSuite('Catalogue', [
  { label: 'items', url: '/catalogue/items', hasDetail: true },
  { label: 'master-lists', url: '/catalogue/master-lists', hasDetail: true },
  { label: 'assets', url: '/catalogue/assets' },
]);

sectionSuite('Dispensary', [
  { label: 'patients', url: '/dispensary/patients', hasDetail: true },
  { label: 'prescriptions', url: '/dispensary/prescription', hasDetail: true },
  { label: 'clinicians', url: '/dispensary/clinicians' },
]);

sectionSuite('Cold Chain', [
  { label: 'equipment', url: '/cold-chain/equipment', hasDetail: true },
  { label: 'monitoring', url: '/cold-chain/monitoring' },
  { label: 'sensors', url: '/cold-chain/sensors' },
]);

sectionSuite('Manage (Central Server)', [
  { label: 'facilities', url: '/manage/facilities' },
  { label: 'global-preferences', url: '/manage/global-preferences' },
  { label: 'manage-equipment', url: '/manage/equipment' },
  { label: 'indicators-demographics', url: '/manage/indicators-demographics' },
  { label: 'campaigns', url: '/manage/campaigns' },
]);

sectionSuite('Programs', [
  { label: 'immunisations', url: '/programs/immunisations' },
]);

sectionSuite('Reports & Settings', [
  { label: 'reports', url: '/reports' },
  { label: 'settings', url: '/settings' },
]);
