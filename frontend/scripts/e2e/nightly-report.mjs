#!/usr/bin/env node
// One classified report for the nightly e2e run. It reads the Playwright
// results.json and classifies it against that branch's previous
// successful run (the baseline). Raw pass/fail can't distinguish "tonight broke
// something" from "this vertical was never built" — the comparison can.
// Vs the baseline:
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
// Usage: node scripts/e2e/nightly-report.mjs
// Each dir holds one <dir>/e2e-report-<leg>/results.json per leg.
//   LEG_ID          (default develop)       — the branch key under test
//   LEG_IDS         (default LEG_ID)        — every leg's artifact suffix,
//                                             comma-separated: the branch key
//                                             itself plus <key>-plugin-<p>
//                                             per plugin profile
//   RESULTS_DIR     (default .e2e-results)  — this run's report
//   BASELINE_DIR    (default .e2e-baseline) — that branch's previous run
//   BASELINE_RUN_ID (env, optional)         — links the header to that run
//   SUMMARY_FILE    (env, optional)         — also write the verdict as JSON
//                                             there, for the clues and issue
//                                             steps (see nightly-lib.mjs)
//
// Both runs' when/at-what-commit provenance comes from the reports
// themselves (stats.startTime + the config.metadata.commit stamped by
// e2e/playwright.config.ts).
//   Missing baseline files → failures listed unclassified, exit 0.
//   Missing run report     → infra failure (stack never produced one), exit 1.
//   A report with NO passes → infra failure too: nothing ran, so it is not a
//                            test result and must not become a baseline.
//   Otherwise exit 1 iff regressions were found.
//
// One run tests one tag and so one branch, but on several STACKS: the
// default suites, plus one per plugin profile (frontend/e2e/README.md §
// Plugin profiles). Each stack is a leg with its own results.json, and they
// are classified together into ONE report — one verdict, one tracking issue
// per branch — because a plugin leg usually goes red for a core reason (a
// host change breaking the plugin contract), and that belongs where core's
// own regressions are read. Each leg still compares only against its own
// file in the baseline run: their test keys overlap (the setup tests run in
// every leg), so a leg is never compared against another leg's results.

import * as fs from 'fs';
import { legKey, testsFromReport } from './nightly-lib.mjs';

const resultsDir = process.env.RESULTS_DIR ?? '.e2e-results';
const baselineDir = process.env.BASELINE_DIR ?? '.e2e-baseline';
const baselineRunId = process.env.BASELINE_RUN_ID;

// `id` is the BRANCH KEY — `develop`, or an RC branch like `v3.03.00-RC`.
// It is the artifact name's suffix (e2e-report-<id>) as well as the lookup
// key, so it is a wire contract with the workflow in both directions, and
// it is what keeps each branch's lineage separate: an RC's run must never
// become develop's baseline. Changing how it is derived orphans every
// existing baseline for that branch.
const legId = process.env.LEG_ID ?? 'develop';
// A plugin leg's id is `<branch key>-plugin-<profile>`; its label drops the
// branch (already in the heading), and is null-keyed as `qualifier` for the
// default leg so its test keys stay bare (nightly-lib legKey).
const LEGS = (process.env.LEG_IDS ?? legId)
  .split(',')
  .map(id => id.trim())
  .filter(Boolean)
  .map(id => {
    const qualifier = id === legId ? null : id.replace(`${legId}-`, '');
    return { id, label: qualifier ?? legId, qualifier };
  });

// The test map comes from nightly-lib.mjs, so the clues and the tracking
// issue match tests by exactly the keys classified here. commit/startTime/
// stats carry the run's provenance, read from the report itself.
const collect = path => {
  if (!fs.existsSync(path)) return null;
  const report = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return {
    tests: testsFromReport(report),
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

// Classification vs the baseline; also indexed by test key so the
// per-test table can name each cell's category.
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

// How a leg's result for one test renders in the per-test table.
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

console.log(`## Deterministic e2e — \`${legId}\`\n`);

console.log('| Stack | Run | ✅ | ❌ | ⚠️ flaky | ⏭ skipped |');
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
    `Baseline: this branch's previous successful run${link} — ${withBaseline
      .map(l => `\`${l.label}\`: ${label(l.baseline)}`)
      .join(' · ')}.\n`
  );
}
for (const leg of legs.filter(l => l.run && !l.baseline)) {
  console.log(
    `_No baseline for \`${leg.label}\` — this branch's first run, or its last successful report has expired. Baselines are never borrowed from another branch (RCs spring off older releases, so develop's would compare a different app and a different suite set), so the failures below are unclassified and this run seeds the lineage._\n`
  );
}

// Infra failure has TWO shapes, and the second is the one that got through on
// the first real run (2026-09-22, run 35791269843). Chromium could not launch
// — a system library missing on the runner — so auth.setup failed and all 676
// tests "did not run". Playwright still wrote a results.json, the suites step
// swallows its exit code by design, and the job went green.
//
// Zero passes is not a test result, and it cannot be a legitimate one: every
// project depends on auth.setup, so a run with nothing expected or flaky means
// the stack, the browser or the login never worked. Treating it as a report
// would also POISON the lineage — a baseline in which no test passed can never
// yield a regression (every failure matches the skipped/unexpected branch
// above and classifies pre-existing), so one broken night would silently
// suppress every night after it.
//
// Red here fixes that for free, without gating the upload: the baseline walk
// selects only SUCCESSFUL runs, so a run that fails this check can never become
// the next run's baseline.
const passes = l => (l.run.stats.expected ?? 0) + (l.run.stats.flaky ?? 0);
const missing = legs.filter(l => !l.run || passes(l) === 0);
if (missing.length) {
  console.log(
    `### 🚨 Infra failure (${missing.length})\n\n` +
      missing
        .map(l =>
          l.run
            ? `- **${l.label}**: a report in which nothing passed (${l.run.stats.unexpected ?? 0} failed, ${l.run.stats.skipped ?? 0} did not run) — the stack, the browser or the login never came up, so this is not a test result. See the run log and the e2e-triage artifact's server.log.`
            : `- **${l.label}**: no results.json — the stack never produced a report (boot failure?). See the run log and the e2e-triage artifact's server.log.`
        )
        .join('\n') +
      '\n'
  );
}

// Regressions in detail, with the failure message; everything else lives
// in the per-test table below.
for (const leg of legs) {
  if (!leg.cats.regression.length) continue;
  console.log(
    `### ❌ ${leg.label} — regressions, passed in the baseline, failing now (${leg.cats.regression.length})\n`
  );
  for (const { key, t } of leg.cats.regression)
    console.log(
      `- \`${legKey(leg.qualifier, key)}\`${t.error ? ` — ${t.error}` : ''}`
    );
  console.log('');
}

// Every test not plain-green, with its classification.
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
  console.log(`### Every test not green (${interesting.length})\n`);
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
    `Skipped tests (${skippedNote}) are \`test.skip\`s or downstream casualties of a failing serial group.\n`
  );

const regressions = legs.reduce((n, l) => n + l.cats.regression.length, 0);
if (process.env.SUMMARY_FILE) {
  // Provenance from the default leg: every leg tests the same tag, so the
  // same commit, and its baseline is the run the others' came from too.
  const [leg] = legs;
  fs.writeFileSync(
    process.env.SUMMARY_FILE,
    JSON.stringify(
      {
        leg: leg.id,
        commit: leg.run?.commit ?? null,
        baselineCommit: leg.baseline?.commit ?? null,
        baselineRunId: baselineRunId ?? null,
        infra: missing.length > 0,
        regressions: legs.flatMap(l =>
          l.cats.regression.map(({ key, t }) => ({
            key: legKey(l.qualifier, key),
            error: t.error,
          }))
        ),
      },
      null,
      2
    )
  );
}
if (regressions || missing.length) {
  const parts = [
    regressions && `${regressions} regression(s)`,
    missing.length && `${missing.length} stack(s) without a usable report`,
  ].filter(Boolean);
  console.log(`**Verdict: ❌ ${parts.join(' + ')} — this job fails.**`);
  process.exit(1);
}
console.log(
  legs.every(l => l.baseline)
    ? '**Verdict: ✅ no regressions** — every failure is pre-existing or belongs to a newly added test.'
    : '**Verdict: ⬜ no regressions; baseline incomplete** — job passes; a successful run seeds the baseline for the next one.'
);
