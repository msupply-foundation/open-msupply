/**
 * Outbound Shipment — the pilot vertical (CHARTER.md §5 C7).
 *
 * Selectors are DOM-shape based because these views carry almost no
 * `data-testid`s. Where a selector is positional it is called out; the e2e
 * testid work landing on other branches should let these tighten up later.
 */
import { test, expect, CDPSession, Page } from '@playwright/test';
import { login } from '../../playwright/helpers/login';
import { Scenario, installProbe, runScenario, setThrottle, THROTTLE_RATE } from '../lib/measure';
import { aggregate, detectBuild, printSummary, writeReport, Report } from '../lib/report';

const RUNS = Number(process.env.PERF_RUNS ?? 7);

const LIST_URL = '/distribution/outbound-shipment?sort=invoiceNumber&dir=desc';
const FAT_URL = '/distribution/outbound-shipment/perf-outbound-fat';

/** First data row's text — the change token for sort/paging scenarios. */
const FIRST_ROW = `document.querySelector('table tbody tr')?.textContent`;
const ROWS = `document.querySelectorAll('table tbody tr').length`;
const DIALOG = `document.querySelector('[role="dialog"]')`;

/** The line-edit modal's "Issue" input: index 1 of the dialog's inputs (0 is the
 *  item selector, 2+ are the per-batch allocation inputs). Positional — see the
 *  guard in `openLineEdit`. */
const ISSUE_INPUT = '[role="dialog"] input';
const ISSUE_INDEX = 1;
const OK_BUTTON = '[role="dialog"] button[aria-label="OK"]';

async function gotoList(page: Page) {
  await page.goto(LIST_URL, { waitUntil: 'domcontentloaded' });
}

async function gotoFat(page: Page) {
  await page.goto(FAT_URL, { waitUntil: 'domcontentloaded' });
}

/** Rows vary per run so we never re-measure an already-cached item's stock lines. */
const rowForRun = (run: number) => run % 8;

async function openLineEdit(page: Page, run: number) {
  await page.locator('table tbody tr').nth(rowForRun(run)).click();
  await page.waitForSelector('[role="dialog"] table tbody tr', { timeout: 60_000 });
  const issue = page.locator(ISSUE_INPUT).nth(ISSUE_INDEX);
  await expect(
    issue,
    'positional Issue-input selector no longer points at a numeric field — re-probe the modal'
  ).toHaveValue(/^[\d,.]*$/);
}

/**
 * Sorting is a two-click flow here, not a header click: `useTableDisplayOptions`
 * deliberately replaces the column-actions button with a full-width invisible
 * one, so clicking anywhere in a header opens the column menu and the sort is
 * applied from a menu item. Both clicks are measured, separately.
 */
const FILTERS_COMBOBOX =
  'div[role="combobox"][aria-labelledby="action-drop-down-label-Filters"]';
const NAME_FILTER_INPUT = 'input[placeholder="Search by name"]';

/** The Name text filter is not mounted until it is picked from the Filters menu. */
async function addNameFilter(page: Page) {
  await page.locator(FILTERS_COMBOBOX).click();
  await page.locator('[role="listbox"] li', { hasText: 'Name' }).first().click();
  await page.waitForSelector(NAME_FILTER_INPUT, { timeout: 30_000 });
}

async function openHeaderMenu(page: Page, header: string) {
  await page.locator('table thead th', { hasText: header }).first().click();
  await page.waitForSelector('[role="menu"]', { timeout: 30_000 });
}

const scenarios: Scenario[] = [
  {
    name: 'list-header-menu',
    budget: 'instant',
    reset: gotoList,
    ready: `${ROWS} >= 20 && !document.querySelector('[role="menu"]')`,
    act: async page => {
      await page.locator('table thead th', { hasText: 'Number' }).first().click();
    },
    settle: `!!document.querySelector('[role="menu"]')`,
  },
  {
    name: 'list-sort',
    budget: 'responsive',
    reset: async page => {
      await gotoList(page);
      await page.waitForSelector('table tbody tr');
      await openHeaderMenu(page, 'Number');
    },
    ready: `!!document.querySelector('[role="menu"]') && ${ROWS} >= 20`,
    token: FIRST_ROW,
    act: async page => {
      await page.locator('li', { hasText: 'Sort by Number ascending' }).first().click();
    },
    settle: `${FIRST_ROW} !== window.__perf.token && ${ROWS} >= 20`,
  },
  {
    name: 'list-filter-open',
    budget: 'instant',
    reset: gotoList,
    ready: `${ROWS} >= 20 && !document.querySelector('[role="listbox"]')`,
    act: async page => {
      await page.locator(FILTERS_COMBOBOX).click();
    },
    settle: `!!document.querySelector('[role="listbox"]')`,
  },
  {
    // The immediate echo of a keystroke. TextFilter holds the value in local
    // state and debounces the URL write by 200 ms, so this should be cheap —
    // only the input ought to re-render.
    name: 'list-filter-keystroke',
    budget: 'instant',
    reset: async page => {
      await gotoList(page);
      await page.waitForSelector('table tbody tr');
      await addNameFilter(page);
      await page.locator(NAME_FILTER_INPUT).focus();
    },
    ready: `!!document.querySelector('${NAME_FILTER_INPUT}')`,
    token: `document.querySelector('${NAME_FILTER_INPUT}').value`,
    act: async page => {
      await page.keyboard.press('Z');
    },
    settle: `document.querySelector('${NAME_FILTER_INPUT}').value !== window.__perf.token`,
  },
  {
    // Same keystroke, followed through to the filtered result. The costly part —
    // the debounced URL write and whatever re-renders because of it — happens in
    // a timer, NOT inside the input event, so it lands in M2/M3 and is invisible
    // to M1. Read this row on blocking time, not interaction latency.
    name: 'list-filter-apply',
    budget: 'responsive',
    reset: async page => {
      await gotoList(page);
      await page.waitForSelector('table tbody tr');
      await addNameFilter(page);
      await page.locator(NAME_FILTER_INPUT).focus();
    },
    ready: `!!document.querySelector('${NAME_FILTER_INPUT}') && ${ROWS} >= 20`,
    token: ROWS,
    act: async page => {
      await page.keyboard.press('Z');
    },
    settle: `location.search.includes('otherPartyName') && ${ROWS} !== window.__perf.token`,
  },
  {
    name: 'list-page-next',
    budget: 'responsive',
    reset: gotoList,
    ready: `${ROWS} >= 20`,
    token: FIRST_ROW,
    act: async page => {
      await page.locator('button:has([data-testid="NavigateNextIcon"])').first().click();
    },
    settle: `${FIRST_ROW} !== window.__perf.token && ${ROWS} >= 20`,
  },
  {
    name: 'list-open-detail',
    budget: 'navigational',
    reset: gotoList,
    ready: `${ROWS} >= 20`,
    act: async page => {
      await page.locator('table tbody tr').first().click();
    },
    settle: `location.pathname.split('/').length > 3 && document.body.innerText.includes('Add item') && ${ROWS} > 0`,
  },
  {
    name: 'detail-sort-lines',
    budget: 'responsive',
    reset: async page => {
      await gotoFat(page);
      await page.waitForSelector('table tbody tr');
      await openHeaderMenu(page, 'Batch');
    },
    ready: `!!document.querySelector('[role="menu"]') && ${ROWS} >= 10`,
    token: FIRST_ROW,
    act: async page => {
      await page.locator('li', { hasText: 'Sort by Batch ascending' }).first().click();
    },
    settle: `${FIRST_ROW} !== window.__perf.token && ${ROWS} >= 10`,
  },
  {
    name: 'detail-tab-log',
    // `responsive`, not `instant`: this swaps the whole tab body — unmounting the
    // 150-line lines table, mounting the activity-log table, and fetching its
    // data. That is a view transition, not a widget toggle. It was originally
    // classed `instant` and looked like a 3.5× budget violation; the budget was
    // wrong, not the app.
    budget: 'responsive',
    reset: gotoFat,
    ready: `${ROWS} >= 10 && document.body.innerText.includes('Unit sell price')`,
    act: async page => {
      await page.getByRole('tab', { name: 'Log' }).click();
    },
    // The lines table's columns are gone once the Log tab owns the view.
    settle: `!document.body.innerText.includes('Unit sell price')`,
  },
  {
    name: 'line-edit-open',
    budget: 'responsive',
    reset: gotoFat,
    ready: `${ROWS} >= 10`,
    act: async (page, run) => {
      await page.locator('table tbody tr').nth(rowForRun(run)).click();
    },
    settle: `!!${DIALOG} && ${DIALOG}.querySelectorAll('table tbody tr').length > 0`,
  },
  {
    name: 'line-edit-type',
    budget: 'instant',
    reset: async (page, run) => {
      await gotoFat(page);
      await page.waitForSelector('table tbody tr');
      await openLineEdit(page, run);
      await page.locator(ISSUE_INPUT).nth(ISSUE_INDEX).fill('1');
      await page.locator(ISSUE_INPUT).nth(ISSUE_INDEX).focus();
    },
    ready: `!!${DIALOG} && ${DIALOG}.querySelectorAll('table tbody tr').length > 0`,
    token: `${DIALOG}.querySelectorAll('input')[${ISSUE_INDEX}].value`,
    act: async page => {
      await page.keyboard.press('5');
    },
    settle: `${DIALOG}.querySelectorAll('input')[${ISSUE_INDEX}].value !== window.__perf.token`,
  },
  {
    name: 'line-edit-save',
    budget: 'responsive',
    reset: async (page, run) => {
      await gotoFat(page);
      await page.waitForSelector('table tbody tr');
      await openLineEdit(page, run);
      // OK is disabled until the form is dirty, so the value written must differ
      // from what is already there — otherwise the click waits on a disabled
      // button forever. Alternating 2/3 keeps it dirty without the value drifting
      // across suite runs.
      const issue = page.locator(ISSUE_INPUT).nth(ISSUE_INDEX);
      await issue.fill((await issue.inputValue()) === '2' ? '3' : '2');
      await expect(
        page.locator(OK_BUTTON),
        'OK stayed disabled after editing the issue quantity — the form did not go dirty'
      ).toBeEnabled();
    },
    ready: `!!${DIALOG} && ${DIALOG}.querySelectorAll('table tbody tr').length > 0`,
    act: async page => {
      await page.locator(OK_BUTTON).click();
    },
    settle: `!${DIALOG}`,
  },
];

test.describe('outbound shipment', () => {
  test('perf suite', async ({ page, context, baseURL }) => {
    test.setTimeout(60 * 60 * 1000);

    await installProbe(context);
    await login(page, { username: 'admin', password: 'pass' });

    const cdp: CDPSession = await context.newCDPSession(page);
    await setThrottle(cdp, 1);

    // Warm the route chunks and detect which build we are actually measuring,
    // rather than trusting what the operator thinks is being served.
    await gotoFat(page);
    await page.waitForSelector('table tbody tr', { timeout: 120_000 });
    const { build, evidence } = await detectBuild(page);
    const claimed = process.env.PERF_BUILD;
    if (claimed && claimed !== build) {
      throw new Error(
        `PERF_BUILD=${claimed} but the page loaded ${(
          evidence.scriptBytes / 1024 / 1024
        ).toFixed(1)} MiB of JS, which is a ${build} build. Refusing to record a mislabelled run.`
      );
    }

    const report: Report = {
      build,
      buildEvidence: evidence,
      throttle: THROTTLE_RATE,
      baseUrl: baseURL ?? '',
      createdAt: new Date().toISOString(),
      scenarios: [],
    };

    for (const scenario of scenarios) {
      const samples = await runScenario(page, cdp, scenario, { runs: RUNS });
      report.scenarios.push(aggregate(scenario, samples));
      // eslint-disable-next-line no-console
      console.log(`  ✓ ${scenario.name}`);
    }

    const file = writeReport(report);
    printSummary(report);
    // eslint-disable-next-line no-console
    console.log(`written: ${file}\n`);
  });
});
