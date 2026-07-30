/**
 * Measurement core for the frontend perf harness. See ../CHARTER.md §2–3.
 *
 * Metrics, per run:
 *   M1 interactionMs — Event Timing `duration` (input → next paint) for the
 *                      interaction. This is the headline number.
 *   M2 settleMs      — interaction start → first animation frame on which the
 *                      scenario's settle predicate holds. Includes network.
 *   M3 blockingMs    — Σ (longtask − 50 ms) inside the interaction window.
 *   M5 gql           — GraphQL requests in the window, plus a serial-depth
 *                      ("waves") estimate.
 *
 * Both M1 and M2 are paint-quantised, so both carry up to one frame of error.
 * That is inherent to measuring "when could the user see it", not a defect.
 */
import fs from 'fs';
import path from 'path';
import { BrowserContext, CDPSession, Page, expect } from '@playwright/test';

export const THROTTLE_RATE = 6;

export interface Sample {
  interactionMs: number | null;
  settleMs: number;
  blockingMs: number;
  longTasks: number;
  gqlCount: number;
  gqlWaves: number;
  gqlSlowestMs: number;
  gqlOps: string[];
}

export interface Scenario {
  /** Stable id — used as the key in baseline JSON. */
  name: string;
  /** Budget class from CHARTER.md §4. */
  budget: 'instant' | 'responsive' | 'navigational';
  /**
   * Return the page to the pre-interaction state. Runs unthrottled, and is
   * re-run before every iteration.
   */
  reset: (page: Page, run: number) => Promise<void>;
  /** JS expression, evaluated in-page, that is true once `reset` has landed. */
  ready: string;
  /**
   * Optional JS expression evaluated just before the interaction; its value is
   * exposed to `settle` as `__perf.token`. Use it when "done" means "changed
   * from what was there before" (e.g. a re-sort).
   */
  token?: string;
  /** The interaction itself. Must be real Playwright input for Event Timing to see it. */
  act: (page: Page, run: number) => Promise<void>;
  /** JS expression, evaluated in-page, true once the user could proceed. */
  settle: string;
}

declare global {
  interface Window {
    __perf: {
      t0: number;
      settleAt: number | null;
      token: unknown;
      events: { name: string; duration: number; startTime: number }[];
      longTasks: { start: number; duration: number }[];
      gql: { op: string; start: number; end: number }[];
      observers: PerformanceObserver[];
      begin(): void;
      markSettled(): void;
      end(): Omit<Sample, never>;
    };
  }
}

/**
 * Installed before any app code runs. The fetch wrapper has to be in place from
 * the start (the app captures no reference we could patch later), so it is on
 * for every run — a constant cost, not a per-run variable.
 */
export async function installProbe(context: BrowserContext) {
  await context.addInitScript(() => {
    const perf: Window['__perf'] = {
      t0: 0,
      settleAt: null,
      token: undefined,
      events: [],
      longTasks: [],
      gql: [],
      observers: [],

      begin() {
        this.observers.forEach(o => o.disconnect());
        this.observers = [];
        this.events = [];
        this.longTasks = [];
        this.gql = [];
        this.settleAt = null;

        const evObs = new PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            this.events.push({
              name: e.name,
              duration: e.duration,
              startTime: e.startTime,
            });
          }
        });
        // 16 ms is the floor the spec allows; the 104 ms default would hide
        // everything inside our "instant" budget class.
        evObs.observe({
          type: 'event',
          buffered: true,
          durationThreshold: 16,
        } as PerformanceObserverInit);
        this.observers.push(evObs);

        const ltObs = new PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            this.longTasks.push({ start: e.startTime, duration: e.duration });
          }
        });
        ltObs.observe({ type: 'longtask', buffered: true });
        this.observers.push(ltObs);

        this.t0 = performance.now();
      },

      markSettled() {
        if (this.settleAt === null) this.settleAt = performance.now();
      },

      end() {
        this.observers.forEach(o => o.disconnect());
        this.observers = [];

        const t0 = this.t0;
        const settleAt = this.settleAt ?? performance.now();
        // One frame of slack: Event Timing startTime is the hardware event
        // timestamp, which can predate our t0 by a hair.
        const from = t0 - 20;

        const INPUT = [
          'click',
          'pointerdown',
          'pointerup',
          'mousedown',
          'mouseup',
          'keydown',
          'keyup',
          'keypress',
          'input',
          'change',
        ];
        const relevant = this.events.filter(
          e => e.startTime >= from && INPUT.includes(e.name)
        );
        const interactionMs = relevant.length
          ? Math.max(...relevant.map(e => e.duration))
          : null;

        const blockingMs = this.longTasks
          .filter(l => l.start + l.duration >= t0 && l.start <= settleAt)
          .reduce((sum, l) => sum + Math.max(0, l.duration - 50), 0);
        const longTasks = this.longTasks.filter(
          l => l.start + l.duration >= t0 && l.start <= settleAt
        ).length;

        const gql = this.gql
          .filter(g => g.start >= from && g.start <= settleAt)
          .sort((a, b) => a.start - b.start);

        // Serial depth: a new wave begins when a request starts after every
        // earlier request in the current wave has already finished.
        let waves = 0;
        let waveEnd = -Infinity;
        for (const g of gql) {
          if (g.start >= waveEnd) {
            waves++;
            waveEnd = g.end;
          } else {
            waveEnd = Math.max(waveEnd, g.end);
          }
        }

        return {
          interactionMs,
          settleMs: settleAt - t0,
          blockingMs,
          longTasks,
          gqlCount: gql.length,
          gqlWaves: waves,
          gqlSlowestMs: gql.length
            ? Math.max(...gql.map(g => g.end - g.start))
            : 0,
          gqlOps: [...new Set(gql.map(g => g.op))],
        };
      },
    };

    window.__perf = perf;

    const nativeFetch = window.fetch;
    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const [input, init] = args;
      const url = typeof input === 'string' ? input : (input as Request)?.url;
      if (!url || !url.includes('graphql')) return nativeFetch.apply(this, args);

      let op = 'unknown';
      try {
        const body = init?.body ?? (input as Request)?.body;
        if (typeof body === 'string') {
          op = JSON.parse(body).operationName ?? 'anonymous';
        }
      } catch {
        // Body is not the JSON we expected; the timing is still worth keeping.
      }

      const start = performance.now();
      try {
        return await nativeFetch.apply(this, args);
      } finally {
        perf.gql.push({ op, start, end: performance.now() });
      }
    };
  });
}

export async function setThrottle(cdp: CDPSession, rate: number) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
}

/** Wait for the main thread to go quiet, so one run cannot bleed into the next. */
async function waitForQuiet(page: Page, quietMs = 250, timeoutMs = 15_000) {
  await page.evaluate(
    async ([quiet, timeout]) => {
      await new Promise<void>(resolve => {
        let last = performance.now();
        const obs = new PerformanceObserver(() => {
          last = performance.now();
        });
        obs.observe({ type: 'longtask', buffered: false });
        const deadline = performance.now() + timeout;
        const tick = () => {
          if (performance.now() - last >= quiet || performance.now() > deadline) {
            obs.disconnect();
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    [quietMs, timeoutMs] as const
  );
}

/**
 * Stamp the settle time from inside the page, on the first animation frame the
 * predicate holds — no round-trip, so no round-trip error.
 */
async function waitForSettle(page: Page, expr: string, timeout: number) {
  await page.waitForFunction(
    src => {
      // eslint-disable-next-line no-new-func
      const ok = new Function('return (' + src + ')')();
      if (!ok) return false;
      window.__perf.markSettled();
      return true;
    },
    expr,
    { polling: 'raf', timeout }
  );
}

/**
 * Progress goes to a file as well as stdout: Playwright's reporter buffers a
 * test's stdout until the test ends, so a suite that hangs mid-run tells you
 * nothing about where. `tail -f perf/results/progress.log` to watch.
 */
export function progress(msg: string) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  const dir = path.join(__dirname, '..', 'results');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, 'progress.log'), line);
  process.stdout.write(line);
}

export async function runScenario(
  page: Page,
  cdp: CDPSession,
  scenario: Scenario,
  { runs, settleTimeout = 30_000 }: { runs: number; settleTimeout?: number }
): Promise<Sample[]> {
  const samples: Sample[] = [];

  for (let run = 0; run < runs; run++) {
    progress(`${scenario.name} run ${run + 1}/${runs} — reset`);
    // Reset unthrottled: getting back to the pre-state is setup, not the thing
    // being measured, and 6× makes it needlessly slow.
    await setThrottle(cdp, 1);
    await scenario.reset(page, run);
    await page.waitForFunction(
      src => new Function('return (' + src + ')')(),
      scenario.ready,
      { polling: 'raf', timeout: settleTimeout }
    );
    await waitForQuiet(page);

    await setThrottle(cdp, THROTTLE_RATE);

    if (scenario.token) {
      await page.evaluate(
        src => {
          window.__perf.token = new Function('return (' + src + ')')();
        },
        scenario.token
      );
    }

    await page.evaluate(() => window.__perf.begin());

    // Guard against the whole class of bogus 0 ms results: if the settle
    // predicate is already satisfied before we act, the scenario is measuring
    // nothing and the number would be a lie.
    const alreadySettled = await page.evaluate(
      src => !!new Function('return (' + src + ')')(),
      scenario.settle
    );
    expect(
      alreadySettled,
      `[${scenario.name}] settle predicate was already true before the interaction — ` +
        `this scenario would measure nothing. Fix the predicate or the reset.`
    ).toBe(false);

    progress(`${scenario.name} run ${run + 1}/${runs} — act`);
    await scenario.act(page, run);
    try {
      await waitForSettle(page, scenario.settle, settleTimeout);
    } catch (err) {
      // Report where it stalled rather than dying with a bare Playwright
      // timeout; a settle predicate that never becomes true is a scenario bug,
      // and the page state is what tells you which one.
      const state = await page
        .evaluate(() => ({
          url: location.href,
          rows: document.querySelectorAll('table tbody tr').length,
          dialog: !!document.querySelector('[role="dialog"]'),
          menu: !!document.querySelector('[role="menu"]'),
          text: (document.body.innerText ?? '').replace(/\n+/g, ' | ').slice(0, 400),
        }))
        .catch(() => null);
      progress(
        `${scenario.name} run ${run + 1} STALLED. settle=\`${scenario.settle}\`\n` +
          `  page: ${JSON.stringify(state)}`
      );
      await setThrottle(cdp, 1);
      throw err;
    }

    const sample = await page.evaluate(() => window.__perf.end());
    await setThrottle(cdp, 1);
    progress(
      `${scenario.name} run ${run + 1}/${runs} — M1=${
        sample.interactionMs ?? '—'
      }ms M2=${Math.round(sample.settleMs)}ms`
    );

    samples.push(sample);
  }

  return samples;
}
