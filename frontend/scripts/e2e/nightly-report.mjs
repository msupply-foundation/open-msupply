#!/usr/bin/env node
// One classified report for the nightly cross-FE e2e run. Both front ends —
// this rewrite and open-msupply's current app — run the same suite
// definition against the same backend; this merges the two Playwright
// results.json files and classifies each leg against the previous
// successful nightly (the baseline). Raw pass/fail can't distinguish
// "tonight broke something" from "this vertical was never built" — the
// comparison can. Per leg, vs its baseline counterpart:
//
//   regression     — passed (or flaky) in the baseline, fails now. With a
//                    missing leg report (boot failure), the only thing that
//                    fails the job.
//   pre-existing   — also failing in the baseline (or skipped there because
//                    its serial group had already aborted).
//   new & failing  — no baseline entry: the test was added since the
//                    baseline run, exercising functionality not built yet.
//   fixed          — failing in the baseline, passes now.
//   flaky          — passed on retry this run (reported, never fails the
//                    job; policy: quarantine-or-fix same day).
//
// The cross-FE columns are the point of merging: a test failing on the
// rewrite but passing on the current app reads as "vertical not built yet
// (or rewrite divergence)", while failing on both points at the suite,
// backend, or datafile.
//
// Usage: node scripts/e2e/nightly-report.mjs
//   RESULTS_DIR     (default .e2e-results)  — <dir>/e2e-report-<leg>/results.json
//   BASELINE_DIR    (default .e2e-baseline) — same layout, previous nightly
//   BASELINE_RUN_ID (env, optional)         — links the header to that run
// Both runs' when/at-what-commit provenance comes from the reports
// themselves (stats.startTime + the config.metadata.commit stamped by
// e2e/playwright.config.ts).
//   Missing baseline files → that leg's failures listed unclassified, exit 0.
//   Missing leg report     → infra failure (stack never produced one), exit 1.
//   Otherwise exit 1 iff regressions were found on either leg.

import * as fs from 'fs';

const resultsDir = process.env.RESULTS_DIR ?? '.e2e-results';
const baselineDir = process.env.BASELINE_DIR ?? '.e2e-baseline';
const baselineRunId = process.env.BASELINE_RUN_ID;

const LEGS = [
  { id: 'rewrite', label: 'Rewrite (this repo)' },
  { id: 'current-app', label: 'Current app (open-msupply)' },
];

// tests: map of "file › describe › … › title" → { outcome, error }. The
// describe chain matters: the same leaf title recurs across groups in one
// file (e.g. "list view renders core controls"). commit/startTime/stats
// carry the run's provenance, read from the report itself.
const collect = path => {
  if (!fs.existsSync(path)) return null;
  const report = JSON.parse(fs.readFileSync(path, 'utf-8'));
  const tests = new Map();
  const walk = (suite, ancestors) => {
    // The file-level suite's title is the file path itself — the spec's
    // `file` field already carries it, so only real describe titles nest.
    const chain =
      suite.title && suite.title !== suite.file
        ? [...ancestors, suite.title]
        : ancestors;
    for (const child of suite.suites ?? []) walk(child, chain);
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const lastRun = t.results?.[t.results.length - 1];
        tests.set([spec.file, ...chain, spec.title].join(' › '), {
          // expected | unexpected | flaky | skipped
          outcome: t.status,
          // First line only, ANSI color codes stripped — it lands in markdown.
          error:
            lastRun?.errors?.[0]?.message
              ?.replace(/\u001b\[[0-9;]*m/g, '')
              .split('\n')[0] ?? '',
        });
      }
    }
  };
  for (const s of report.suites ?? []) walk(s, []);
  return {
    tests,
    commit: report.config?.metadata?.commit,
    startTime: report.stats?.startTime,
    stats: report.stats ?? {},
  };
};

const legs = LEGS.map(leg => ({
  ...leg,
  run: collect(`${resultsDir}/e2e-report-${leg.id}/results.json`),
  baseline: collect(`${baselineDir}/e2e-report-${leg.id}/results.json`),
}));

// Per-leg classification vs its baseline counterpart; also indexed by test
// key so the cross-FE table can name each cell's category.
for (const leg of legs) {
  leg.cats = {
    regression: [],
    preExisting: [],
    newFailing: [],
    fixed: [],
    flaky: [],
    unclassified: [],
  };
  leg.catByKey = new Map();
  if (!leg.run) continue;
  for (const [key, t] of leg.run.tests) {
    const base = leg.baseline?.tests.get(key);
    let cat = null;
    if (t.outcome === 'unexpected') {
      if (!leg.baseline) cat = 'unclassified';
      else if (!base) cat = 'newFailing';
      else if (base.outcome === 'unexpected' || base.outcome === 'skipped')
        cat = 'preExisting';
      else cat = 'regression';
    } else if (t.outcome === 'flaky') cat = 'flaky';
    else if (t.outcome === 'expected' && base?.outcome === 'unexpected')
      cat = 'fixed';
    if (cat) {
      leg.cats[cat].push({ key, t });
      leg.catByKey.set(key, cat);
    }
  }
}

// "2026-07-28 14:03 UTC at `abc1234`" — every leg and baseline is a main-ish
// run, so the date + commit pair is what tells them apart.
const label = run =>
  [
    run?.startTime
      ? `${run.startTime.replace('T', ' ').slice(0, 16)} UTC`
      : null,
    run?.commit ? `\`${run.commit.slice(0, 7)}\`` : null,
  ]
    .filter(Boolean)
    .join(' at ') || 'unknown provenance';

// How a leg's result for one test renders in the cross-FE table.
const CELL = {
  regression: '❌ **regression**',
  preExisting: '⏳ pre-existing',
  newFailing: '🆕 new & failing',
  unclassified: '❌ failing (no baseline)',
  fixed: '✅ fixed',
  flaky: '⚠️ flaky',
};
const cell = (leg, key) => {
  if (!leg.run) return '🚨 no report';
  const t = leg.run.tests.get(key);
  if (!t) return '—';
  const cat = leg.catByKey.get(key);
  if (cat) return CELL[cat];
  return t.outcome === 'skipped' ? '⏭ skipped' : '✅';
};

console.log('## Nightly deterministic e2e — both front ends\n');

console.log('| Front end | Run | ✅ | ❌ | ⚠️ flaky | ⏭ skipped |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const leg of legs) {
  const s = leg.run?.stats ?? {};
  console.log(
    leg.run
      ? `| ${leg.label} | ${label(leg.run)} | ${s.expected ?? 0} | ${s.unexpected ?? 0} | ${s.flaky ?? 0} | ${s.skipped ?? 0} |`
      : `| ${leg.label} | 🚨 no report produced | — | — | — | — |`
  );
}
console.log('');

const withBaseline = legs.filter(l => l.baseline);
if (withBaseline.length) {
  const link = baselineRunId
    ? ` ([run ${baselineRunId}](../actions/runs/${baselineRunId}))`
    : '';
  console.log(
    `Baseline: previous successful nightly${link} — ${withBaseline
      .map(l => `${l.label.toLowerCase().split(' (')[0]}: ${label(l.baseline)}`)
      .join(' · ')}.\n`
  );
}
for (const leg of legs.filter(l => l.run && !l.baseline)) {
  console.log(
    `_No baseline for the ${leg.label} leg (first nightly, or the last successful run's report expired) — its failures below are unclassified._\n`
  );
}

const missing = legs.filter(l => !l.run);
if (missing.length) {
  console.log(
    `### 🚨 Infra failure (${missing.length})\n\n` +
      missing
        .map(
          l =>
            `- **${l.label}**: no results.json — the stack never produced a report (boot failure?). See the leg's run log and stack-logs artifact.`
        )
        .join('\n') +
      '\n'
  );
}

// Regressions in detail (with the failure message and the other leg's state
// for triage); everything else lives in the cross-FE table below.
const other = leg => legs.find(l => l !== leg);
for (const leg of legs) {
  if (!leg.cats.regression.length) continue;
  console.log(
    `### ❌ ${leg.label} — regressions, passed in the baseline, failing now (${leg.cats.regression.length})\n`
  );
  for (const { key, t } of leg.cats.regression)
    console.log(
      `- \`${key}\`${t.error ? ` — ${t.error}` : ''} _(${other(leg).label.toLowerCase().split(' (')[0]}: ${cell(other(leg), key)})_`
    );
  console.log('');
}

// Every test not plain-green on both front ends, side by side.
const interesting = [
  ...new Set(
    legs.flatMap(l =>
      [...(l.run?.tests ?? [])]
        .filter(([, t]) => t.outcome !== 'expected')
        .map(([key]) => key)
    )
  ),
].sort();
if (interesting.length) {
  console.log(
    `### Cross-FE picture — every test not green on both front ends (${interesting.length})\n`
  );
  console.log(`| Test | ${legs.map(l => l.label).join(' | ')} |`);
  console.log(`| --- | ${legs.map(() => '---').join(' | ')} |`);
  for (const key of interesting)
    console.log(
      `| \`${key.replace(/\|/g, '\\|')}\` | ${legs.map(l => cell(l, key)).join(' | ')} |`
    );
  console.log('');
}

for (const leg of legs) {
  if (!leg.cats.fixed.length) continue;
  console.log(
    `### ✅ ${leg.label} — fixed, failing in the baseline, passing now (${leg.cats.fixed.length})\n`
  );
  for (const { key } of leg.cats.fixed) console.log(`- \`${key}\``);
  console.log('');
}

const skippedNote = legs
  .filter(l => l.run && (l.run.stats.skipped ?? 0) > 0)
  .map(l => `${l.label}: ${l.run.stats.skipped}`)
  .join(' · ');
if (skippedNote)
  console.log(
    `Skipped tests (${skippedNote}) are per-FE \`test.skip\`s or downstream casualties of a failing serial group.\n`
  );

const regressions = legs.reduce((n, l) => n + l.cats.regression.length, 0);
if (regressions || missing.length) {
  const parts = [
    regressions && `${regressions} regression(s)`,
    missing.length && `${missing.length} leg(s) without a report`,
  ].filter(Boolean);
  console.log(`**Verdict: ❌ ${parts.join(' + ')} — this job fails.**`);
  process.exit(1);
}
console.log(
  legs.every(l => l.baseline)
    ? '**Verdict: ✅ no regressions on either front end** — every failure is pre-existing or belongs to a newly added test.'
    : '**Verdict: ⬜ no regressions; baseline incomplete** — job passes; a successful run seeds the baseline for the next one.'
);
