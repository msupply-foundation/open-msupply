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
import { authFile } from '../playwright.config';

// ─── Shared utilities ────────────────────────────────────────────────────────

const screenshotDir = path.join(__dirname, '../screenshots/smoke');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Wait time after navigation/click for infinite render loops to manifest and be detected via console messages.
// Can be reduced once we update to React 19 as it is much stricter about infinite updates and will throw an error instead of trying to recover with degraded performance.
const RENDER_WAIT_MS = 2000;

// If a single navigation/action produces more than this many console messages
// (of any type), treat it as excessive logging and fail.
const EXCESSIVE_LOG_THRESHOLD = 60;

function toSafeName(label: string) {
  return label.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

function screenshot(page: Page, name: string) {
  return page.screenshot({ path: path.join(screenshotDir, `${name}.png`) });
}

interface ErrorTracker {
  errors: string[];
  warnings: string[];
  /** Total console messages (all types) — used to detect rapid accumulation. */
  messageCount: number;
  hasInfiniteLoop: boolean;
}

function setupErrorTracking(page: Page): ErrorTracker {
  const tracker: ErrorTracker = {
    errors: [],
    warnings: [],
    messageCount: 0,
    hasInfiniteLoop: false,
  };
  page.on('console', msg => {
    tracker.messageCount++;
    const text = msg.text();
    if (msg.type() === 'error') {
      tracker.errors.push(text);
      if (
        text.includes('Maximum update depth exceeded') ||
        text.includes('Too many re-renders')
      ) {
        tracker.hasInfiniteLoop = true;
      }
    } else if (msg.type() === 'warning') {
      tracker.warnings.push(text);
    }
  });
  page.on('pageerror', err => {
    tracker.errors.push(err.message);
  });
  return tracker;
}

function resetTracker(tracker: ErrorTracker) {
  tracker.errors = [];
  tracker.warnings = [];
  tracker.messageCount = 0;
  tracker.hasInfiniteLoop = false;
}

function reportErrors(tracker: ErrorTracker, label: string) {
  if (tracker.errors.length > 0) {
    console.log(`  ERRORS in ${label}:`);
    tracker.errors
      .slice(0, 5)
      .forEach(e => console.log(`    ${e.substring(0, 200)}`));
  }
  if (tracker.warnings.length > 0) {
    console.log(`  WARNINGS in ${label}:`);
    tracker.warnings
      .slice(0, 5)
      .forEach(e => console.log(`    ${e.substring(0, 200)}`));
  }
  if (tracker.hasInfiniteLoop) {
    console.log(`  !!! INFINITE LOOP in ${label}`);
  }

  expect.soft(tracker.errors, `Console errors in ${label}`).toHaveLength(0);
  expect.soft(tracker.warnings, `Console warnings in ${label}`).toHaveLength(0);
  expect
    .soft(
      tracker.messageCount,
      `Excessive logging in ${label} (${tracker.messageCount} messages)`
    )
    .toBeLessThan(EXCESSIVE_LOG_THRESHOLD);
}

/** Dismiss any open MUI dialog that may intercept clicks. */
async function dismissOpenDialog(page: Page) {
  const dialog = page.locator('.MuiDialog-root');
  if (!(await dialog.isVisible({ timeout: 500 }).catch(() => false))) return;
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
}

/** Navigate to a list page and intercept all GraphQL responses. */
async function collectGraphQLFromPage(page: Page, listUrl: string) {
  const graphqlResponses: Promise<any>[] = [];
  page.on('response', r => {
    if (r.url().includes('/graphql')) {
      graphqlResponses.push(r.json().catch(() => null));
    }
  });

  await page
    .goto(listUrl, { waitUntil: 'networkidle', timeout: RENDER_WAIT_MS })
    .catch(() => {});

  return Promise.all(graphqlResponses);
}

// ─── Page-level helpers ──────────────────────────────────────────────────────

async function navigateAndCheck(
  page: Page,
  tracker: ErrorTracker,
  url: string,
  label: string
) {
  resetTracker(tracker);
  await page
    .goto(url, { waitUntil: 'networkidle', timeout: RENDER_WAIT_MS })
    .catch(() => {});
  await page.waitForTimeout(RENDER_WAIT_MS);

  await screenshot(page, toSafeName(label));

  reportErrors(tracker, label);
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

  await row.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(RENDER_WAIT_MS);

  await screenshot(page, `${toSafeName(label)}-detail`);

  reportErrors(tracker, `${label} detail`);
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
    await page.waitForTimeout(RENDER_WAIT_MS);

    await screenshot(page, toSafeName(`${label}-tab-${tabName}`));

    reportErrors(tracker, `${label} > ${tabName}`);
  }
}

// ─── Suite helpers ───────────────────────────────────────────────────────────

/** Visit every route in a section; optionally click into the first row and its tabs. */
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
      context = await browser.newContext({ storageState: authFile });
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
          // Ensure we're on the list page (may already be there from the list test)
          await page
            .goto(route.url, {
              waitUntil: 'networkidle',
              timeout: RENDER_WAIT_MS,
            })
            .catch(() => {});
          if (await clickFirstRowAndCheck(page, tracker, route.label)) {
            await clickTabsAndCheck(page, tracker, route.label);
            await page.goBack();
          }
        });
      }
    }
  });
}

/** Find a specific row via GraphQL, then visit each tab on its detail view. */
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
      context = await browser.newContext({ storageState: authFile });
      page = await context.newPage();
      tracker = setupErrorTracking(page);

      const allData = await collectGraphQLFromPage(page, listUrl);
      for (const data of allData) {
        const id = findId(data);
        if (id) {
          detailUrl = `${detailPath}/${id}`;
          break;
        }
      }

      if (!detailUrl) {
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

/**
 * Find an editable shipment via GraphQL, navigate to its detail,
 * click a line item to open the edit modal, and check for infinite rerenders.
 * Editable statuses based on isInboundDisabled / isOutboundDisabled in utils.ts.
 */
function lineEditSuite(
  name: string,
  routes: {
    label: string;
    listUrl: string;
    detailPath: string | ((node: any) => string);
    /** Ordered by likelihood of having lines — last status is preferred. */
    editableStatuses: string[];
  }[]
) {
  test.describe(name, () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let context: BrowserContext;
    let tracker: ErrorTracker;

    test.beforeAll(async ({ browser }) => {
      context = await browser.newContext({ storageState: authFile });
      page = await context.newPage();
      tracker = setupErrorTracking(page);
    });

    test.afterAll(async () => {
      await context?.close();
    });

    for (const route of routes) {
      test(`${route.label} line edit modal`, async () => {
        const allData = await collectGraphQLFromPage(page, route.listUrl);

        // Find the best editable shipment (prefer statuses later in the list)
        let detailUrl: string | undefined;
        for (const data of allData) {
          const nodes = data?.data?.invoices?.nodes ?? [];
          const editable = nodes.filter((n: any) =>
            route.editableStatuses.includes(n.status)
          );
          if (editable.length === 0) continue;

          const statusOrder = route.editableStatuses;
          editable.sort(
            (a: any, b: any) =>
              statusOrder.indexOf(b.status) - statusOrder.indexOf(a.status)
          );
          const match = editable[0];
          const basePath =
            typeof route.detailPath === 'function'
              ? route.detailPath(match)
              : route.detailPath;
          detailUrl = `${basePath}/${match.id}`;
          break;
        }

        if (!detailUrl) {
          console.log(
            `  No editable ${route.label} found (need status: ${route.editableStatuses.join('/')}), skipping`
          );
          return;
        }

        // Navigate directly to the editable shipment detail
        resetTracker(tracker);
        await page
          .goto(detailUrl, {
            waitUntil: 'networkidle',
            timeout: RENDER_WAIT_MS,
          })
          .catch(() => {});
        await page.waitForTimeout(RENDER_WAIT_MS);

        // Click the first line item row to open the edit modal
        const lineRow = page.locator('tbody tr').first();
        if (!(await lineRow.isVisible({ timeout: 3000 }).catch(() => false))) {
          console.log(`  No line items in ${route.label}, skipping`);
          return;
        }

        if (tracker.hasInfiniteLoop) {
          reportErrors(tracker, `${route.label} line edit modal`);
          return;
        }
        await dismissOpenDialog(page);

        await lineRow.click();
        await page.waitForTimeout(RENDER_WAIT_MS);

        const modal = page.locator('.MuiDialog-root');
        if (!(await modal.isVisible({ timeout: 3000 }).catch(() => false))) {
          console.log(`  Modal did not open in ${route.label}, skipping`);
          return;
        }

        await page.waitForTimeout(RENDER_WAIT_MS);

        await screenshot(page, `${toSafeName(route.label)}-line-edit-modal`);

        reportErrors(tracker, `${route.label} line edit modal`);
        expect
          .soft(
            tracker.hasInfiniteLoop,
            `Infinite loop in ${route.label} line edit modal`
          )
          .toBe(false);
      });
    }
  });
}

// ─── Test configuration ──────────────────────────────────────────────────────

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

lineEditSuite('Line Edit Modals', [
  {
    label: 'inbound-shipment',
    listUrl: '/replenishment/inbound-shipment',
    // External inbound shipments (from PO) use a different detail route
    detailPath: (node: any) =>
      node.purchaseOrder
        ? '/replenishment/inbound-shipment-external'
        : '/replenishment/inbound-shipment',
    editableStatuses: ['NEW', 'DELIVERED', 'RECEIVED'],
  },
  {
    label: 'outbound-shipment',
    listUrl: '/distribution/outbound-shipment',
    detailPath: '/distribution/outbound-shipment',
    editableStatuses: ['NEW', 'ALLOCATED', 'PICKED'],
  },
]);

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
