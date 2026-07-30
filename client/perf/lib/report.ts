/**
 * Aggregation, build-mode detection, and baseline comparison. See ../CHARTER.md.
 */
import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';
import { Sample, Scenario } from './measure';

export const BUDGETS = {
  instant: 100,
  responsive: 500,
  navigational: 1000,
} as const;

export interface Aggregate {
  name: string;
  budget: Scenario['budget'];
  budgetMs: number;
  runs: number;
  /** M1 */
  interactionMedian: number | null;
  interactionP95: number | null;
  /** M2 */
  settleMedian: number;
  settleP95: number;
  /** M3 */
  blockingMedian: number;
  /** M5 */
  gqlCount: number;
  gqlWaves: number;
  gqlSlowestMs: number;
  gqlOps: string[];
  samples: Sample[];
}

export interface Report {
  build: 'dev' | 'prod';
  buildEvidence: { scriptBytes: number; scriptCount: number };
  throttle: number;
  baseUrl: string;
  createdAt: string;
  scenarios: Aggregate[];
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/**
 * Nearest-rank p95. At our run counts (6 measured) this is the maximum by
 * definition — deliberately so: the worst observed run is the honest tail here,
 * and pretending to a smoother percentile from 6 points would be false
 * precision. Raise `runs` if a real p95 is ever needed.
 */
const p95 = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.ceil(0.95 * s.length) - 1]!;
};

export function aggregate(scenario: Scenario, samples: Sample[]): Aggregate {
  // Drop the warm-up run (module chunks, query cache, JIT).
  const measured = samples.length > 1 ? samples.slice(1) : samples;
  const interactions = measured
    .map(s => s.interactionMs)
    .filter((n): n is number => n !== null);

  return {
    name: scenario.name,
    budget: scenario.budget,
    budgetMs: BUDGETS[scenario.budget],
    runs: measured.length,
    interactionMedian: interactions.length ? median(interactions) : null,
    interactionP95: interactions.length ? p95(interactions) : null,
    settleMedian: median(measured.map(s => s.settleMs)),
    settleP95: p95(measured.map(s => s.settleMs)),
    blockingMedian: median(measured.map(s => s.blockingMs)),
    gqlCount: Math.round(median(measured.map(s => s.gqlCount))),
    gqlWaves: Math.round(median(measured.map(s => s.gqlWaves))),
    gqlSlowestMs: Math.round(median(measured.map(s => s.gqlSlowestMs))),
    gqlOps: [...new Set(measured.flatMap(s => s.gqlOps))],
    samples: measured,
  };
}

/**
 * Which build is actually loaded, decided from evidence rather than from what
 * the operator believes. Dev and prod are served on the same port by different
 * commands, and mistaking one for the other invalidates every number — this has
 * bitten before, so it is measured, not asserted.
 *
 * The webpack dev build ships ~28 MiB of unminified JS; the production build is
 * a couple of MiB. There is no ambiguity in between.
 */
export async function detectBuild(page: Page): Promise<{
  build: 'dev' | 'prod';
  evidence: { scriptBytes: number; scriptCount: number };
}> {
  const evidence = await page.evaluate(() => {
    const scripts = performance
      .getEntriesByType('resource')
      .filter((r): r is PerformanceResourceTiming => {
        const rt = r as PerformanceResourceTiming;
        return rt.initiatorType === 'script' || /\.js(\?|$)/.test(rt.name);
      });
    return {
      scriptBytes: scripts.reduce(
        (sum, r) => sum + (r.decodedBodySize || r.transferSize || 0),
        0
      ),
      scriptCount: scripts.length,
    };
  });

  return {
    build: evidence.scriptBytes > 8_000_000 ? 'dev' : 'prod',
    evidence,
  };
}

const RESULTS_DIR = path.join(__dirname, '..', 'results');
const BASELINE_DIR = path.join(__dirname, '..', 'baseline');

export function writeReport(report: Report): string {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = report.createdAt.replace(/[:.]/g, '-');
  const file = path.join(RESULTS_DIR, `${report.build}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));

  if (process.env.PERF_BASELINE) {
    fs.mkdirSync(BASELINE_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(BASELINE_DIR, `${report.build}.json`),
      JSON.stringify(report, null, 2)
    );
  }
  return file;
}

export function readBaseline(build: 'dev' | 'prod'): Report | null {
  const file = path.join(BASELINE_DIR, `${build}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Report;
}

const pad = (s: string, n: number) => s.padEnd(n);
/** `—` means no Event Timing entry cleared the 16 ms observer floor, i.e. the
 *  interaction was faster than 16 ms — a good result, not a missing one. */
const num = (n: number | null, n2 = 6) =>
  (n === null ? '<16' : Math.round(n).toString()).padStart(n2);

export function printSummary(report: Report) {
  const baseline = readBaseline(report.build);
  const lines: string[] = [];

  lines.push('');
  lines.push(
    `Perf report — build=${report.build} (${(
      report.buildEvidence.scriptBytes /
      1024 /
      1024
    ).toFixed(1)} MiB JS, ${report.buildEvidence.scriptCount} scripts), ` +
      `CPU throttle ${report.throttle}×, ${report.baseUrl}`
  );
  if (baseline) {
    lines.push(`Comparing against baseline/${report.build}.json`);
  } else {
    lines.push(
      `No baseline/${report.build}.json — run with PERF_BASELINE=1 to record one.`
    );
  }
  lines.push('');
  lines.push(
    `${pad('scenario', 26)}${pad('class', 14)}` +
      `${pad('M1 med', 8)}${pad('M1 p95', 8)}${pad('budget', 8)}` +
      `${pad('M2 med', 8)}${pad('M3 blk', 8)}${pad('gql', 10)}${pad('Δ M1 p95', 12)}`
  );
  lines.push('-'.repeat(108));

  for (const s of report.scenarios) {
    const base = baseline?.scenarios.find(b => b.name === s.name);
    let delta = '';
    if (base?.interactionP95 && s.interactionP95) {
      const pct = ((s.interactionP95 - base.interactionP95) / base.interactionP95) * 100;
      delta = `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
    }
    const over =
      s.interactionP95 !== null && s.interactionP95 > s.budgetMs
        ? `${(s.interactionP95 / s.budgetMs).toFixed(1)}× over`
        : 'ok';

    lines.push(
      `${pad(s.name, 26)}${pad(s.budget, 14)}` +
        `${num(s.interactionMedian)}  ${num(s.interactionP95)}  ` +
        `${pad(over, 8)}` +
        `${num(s.settleMedian)}  ${num(s.blockingMedian)}  ` +
        `${pad(`${s.gqlCount}/${s.gqlWaves}w`, 10)}${pad(delta, 12)}`
    );
  }

  lines.push('');
  lines.push(
    'M1 interaction latency (input→paint) · M2 settle (incl. network) · ' +
      'M3 blocking · gql = requests/serial waves. All ms, median of ' +
      `${report.scenarios[0]?.runs ?? 0} runs.`
  );
  lines.push('');

  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}
