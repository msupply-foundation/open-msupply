/**
 * Diagnostic bisection, not part of the baseline. Run with PERF_DIAG=1.
 *
 * Question: is the ~1.8 s cost of a URL search-param write proportional to how
 * much table is on screen, or is it fixed overhead paid regardless?
 *
 * Same interaction (column sort → URL write) against three very different
 * tables, in one run so conditions are identical:
 *   - 2-line shipment detail   (2 rows × 15 cols)
 *   - 150-line shipment detail (19 rows in DOM × 15 cols, virtualized)
 *   - outbound list            (20 rows × 8 cols, not virtualized)
 *
 * Flat across all three ⇒ fixed overhead (app shell / MRT setup / emotion).
 * Scaling with rows ⇒ per-row render cost.
 */
import { test, CDPSession } from '@playwright/test';
import { login } from '../../playwright/helpers/login';
import {
  Scenario,
  installProbe,
  runScenario,
  setThrottle,
  progress,
} from '../lib/measure';
import { aggregate } from '../lib/report';

const RUNS = Number(process.env.PERF_RUNS ?? 7);
const ROWS = `document.querySelectorAll('table tbody tr').length`;
const FIRST_ROW = `document.querySelector('table tbody tr')?.textContent`;

/**
 * Settles on the URL search param rather than on the first row changing: a
 * 2-row table may already be in the target order, so a row-order predicate can
 * never become true and the scenario would stall.
 *
 * M1 is unaffected by this choice — Event Timing measures the click through to
 * the next paint, which is precisely the re-render cost under test. M2/M3 are
 * truncated here (the param lands before the render finishes) and should be
 * ignored for this diagnostic.
 */
const sortScenario = (
  name: string,
  url: string,
  header: string,
  sortKey: string,
  minRows: number
): Scenario => ({
  name,
  budget: 'responsive',
  reset: async page => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('table tbody tr');
    await page.locator('table thead th', { hasText: header }).first().click();
    await page.waitForSelector('[role="menu"]', { timeout: 30_000 });
  },
  ready: `!!document.querySelector('[role="menu"]') && ${ROWS} >= ${minRows}`,
  token: FIRST_ROW,
  act: async page => {
    await page
      .locator('li', { hasText: `Sort by ${header} ascending` })
      .first()
      .click();
  },
  settle: `location.search.includes('sort=${sortKey}&dir=asc') && ${ROWS} >= ${minRows}`,
});

const scenarios: Scenario[] = [
  sortScenario(
    'diag-sort-detail-2line',
    '/distribution/outbound-shipment/perf-outbound-list-0001',
    'Batch',
    'batch',
    1
  ),
  sortScenario(
    'diag-sort-detail-150line',
    '/distribution/outbound-shipment/perf-outbound-fat',
    'Batch',
    'batch',
    10
  ),
  sortScenario(
    'diag-sort-list-20rows',
    '/distribution/outbound-shipment?sort=invoiceNumber&dir=desc',
    'Number',
    'invoiceNumber',
    20
  ),
];

/**
 * Pure re-render probe. `history.pushState` + a synthetic `popstate` makes
 * react-router adopt a new location without any user-visible change and without
 * touching any query the page actually reads — so nothing refetches and nothing
 * in the DOM needs to differ. Whatever main-thread time that costs IS the cost
 * of a location change alone.
 *
 * Measured as blocking time inside a fixed window (there is no DOM change to
 * settle on, and popstate is not an input event so Event Timing sees nothing).
 */
const POPSTATE_WINDOW_MS = 2500;

async function popstateCost(
  page: import('@playwright/test').Page,
  url: string,
  readySelector: string,
  runs: number
) {
  const samples: number[] = [];
  for (let run = 0; run < runs; run++) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(readySelector, { timeout: 60_000 });
    await page.waitForTimeout(1200);

    await page.evaluate(() => window.__perf.begin());
    const blocking = await page.evaluate(
      async ([windowMs, seq]) => {
        const search = new URLSearchParams(location.search);
        search.set('perfProbe', String(seq));
        history.pushState({}, '', `${location.pathname}?${search}`);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        await new Promise(r => setTimeout(r, windowMs));
        window.__perf.markSettled();
        return window.__perf.end().blockingMs;
      },
      [POPSTATE_WINDOW_MS, run] as const
    );
    // Discard the warm-up run.
    if (run > 0) samples.push(blocking);
  }
  const sorted = samples.sort((a, b) => a - b);
  return {
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
    all: sorted,
  };
}

test.describe('diagnostics', () => {
  test('cost of a location change alone', async ({ page, context }) => {
    test.skip(!process.env.PERF_DIAG, 'set PERF_DIAG=1 to run diagnostics');
    test.setTimeout(60 * 60 * 1000);

    await installProbe(context);
    await login(page, { username: 'admin', password: 'pass' });
    const cdp: CDPSession = await context.newCDPSession(page);
    await setThrottle(cdp, 6);

    const pages: [string, string, string][] = [
      ['list-20rows', '/distribution/outbound-shipment', 'table tbody tr'],
      [
        'detail-2line',
        '/distribution/outbound-shipment/perf-outbound-list-0001',
        'table tbody tr',
      ],
      [
        'detail-150line',
        '/distribution/outbound-shipment/perf-outbound-fat',
        'table tbody tr',
      ],
      ['no-table-help', '/help', 'text=Help'],
    ];

    for (const [label, url, ready] of pages) {
      try {
        const { median, all } = await popstateCost(page, url, ready, 5);
        progress(`POPSTATE ${label}: blocking median=${median}ms all=[${all}]`);
      } catch (err) {
        progress(`POPSTATE ${label}: FAILED ${(err as Error).message.slice(0, 120)}`);
      }
    }
    await setThrottle(cdp, 1);
  });

  /**
   * Attributes the cost of a location change across the app-shell regions, per
   * commit — which is how the double render (a `nested-update` blocking the paint)
   * was found.
   *
   * This one is NOT self-contained: it needs temporary `React.Profiler` wrappers
   * added to `host/src/Site.tsx`, pushing `{id, phase, actualDuration}` onto
   * `window.__profile`. That instrumentation is deliberately not committed — it is
   * a diagnostic, not a standing test. Wrap the regions you want to attribute:
   *
   *   const onProfilerRender = (id, phase, actualDuration) => {
   *     (window.__profile ??= []).push({ id, phase, actualDuration });
   *   };
   *   const P = ({ id, children }) => (
   *     <React.Profiler id={id} onRender={onProfilerRender}>{children}</React.Profiler>
   *   );
   *
   * …then wrap AppDrawer / AppBar / Routes / Footer / DetailPanel in `<P id="…">`.
   */
  test('profiler attribution of a location change', async ({ page, context }) => {
    test.skip(!process.env.PERF_PROFILE, 'set PERF_PROFILE=1 to run');
    test.setTimeout(60 * 60 * 1000);

    await installProbe(context);
    await login(page, { username: 'admin', password: 'pass' });
    const cdp: CDPSession = await context.newCDPSession(page);
    await setThrottle(cdp, 6);

    for (const [label, url, ready] of [
      ['list-20rows', '/distribution/outbound-shipment', 'table tbody tr'],
      [
        'detail-2line',
        '/distribution/outbound-shipment/perf-outbound-list-0001',
        'table tbody tr',
      ],
      [
        'detail-150line',
        '/distribution/outbound-shipment/perf-outbound-fat',
        'table tbody tr',
      ],
      // No MRT table on this route: if the nested-update still happens here it
      // comes from the shell/providers, not from the table layer.
      ['dashboard-no-table', '/dashboard', 'body'],
    ] as const) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(ready, { timeout: 60_000 });
      await page.waitForTimeout(2500);

      const tally = await page.evaluate(async () => {
        const w = window as unknown as {
          __profile?: { id: string; phase: string; actualDuration: number }[];
        };
        // Fail loudly rather than reporting an empty tally that reads as "nothing
        // re-rendered" when the truth is "the instrumentation isn't there".
        if (!Array.isArray(w.__profile)) {
          throw new Error(
            'window.__profile is missing — add the temporary React.Profiler ' +
              'wrappers to host/src/Site.tsx (see this test\'s doc comment).'
          );
        }
        w.__profile = [];
        const search = new URLSearchParams(location.search);
        search.set('perfProbe', String(Math.floor(performance.now())));
        history.pushState({}, '', `${location.pathname}?${search}`);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        await new Promise(r => setTimeout(r, 2500));

        // Per-commit detail, in order, so a render→effect→setState cascade is
        // visible as separate commits rather than hidden in a total.
        return (w.__profile ?? []).map(
          e => `${e.id}:${e.phase}:${Math.round(e.actualDuration)}ms`
        );
      });
      progress(`PROFILE ${label}: ${tally.join('  ')}`);
    }
    await setThrottle(cdp, 1);
  });

  test('url-write cost vs table size', async ({ page, context }) => {
    test.skip(!process.env.PERF_DIAG, 'set PERF_DIAG=1 to run diagnostics');
    test.setTimeout(60 * 60 * 1000);

    await installProbe(context);
    await login(page, { username: 'admin', password: 'pass' });
    const cdp: CDPSession = await context.newCDPSession(page);
    await setThrottle(cdp, 1);

    for (const scenario of scenarios) {
      const samples = await runScenario(page, cdp, scenario, { runs: RUNS });
      const agg = aggregate(scenario, samples);
      progress(
        `RESULT ${agg.name}: M1 med=${agg.interactionMedian} p95=${agg.interactionP95} ` +
          `M2 med=${Math.round(agg.settleMedian)} M3 blk=${Math.round(agg.blockingMedian)} ` +
          `rows-in-dom=${await page.evaluate(
            () => document.querySelectorAll('table tbody tr').length
          )}`
      );
    }
  });
});
