#!/usr/bin/env node
// Classify a Playwright results.json against the most recent main run's
// report, so a permanently-red suite still yields a per-PR verdict. Raw
// pass/fail can't distinguish "this PR broke something" from "this vertical
// was never built" — the comparison can:
//
//   regression     — passed (or flaky) on main, fails here. The only
//                    category that fails the job.
//   pre-existing   — also failing on main (or skipped there because its
//                    serial group had already aborted).
//   new & failing  — no baseline entry: the test was added since the
//                    baseline run, exercising functionality not built yet.
//   fixed          — failing on main, passes here.
//   flaky          — passed here on retry (reported, never fails the job;
//                    policy: quarantine-or-fix same day).
//
// Skipped tests are downstream casualties of a failing serial group, so
// they're reported as counts, not classified individually.
//
// Usage: node scripts/e2e/classify-vs-baseline.mjs [pr-results.json] [baseline-results.json]
//   Defaults: e2e/playwright-report/results.json  .e2e-baseline/results.json
//   BASELINE_RUN_ID / BASELINE_SHA (env, optional) — provenance for the header.
//   Missing baseline file → failures listed unclassified, exit 0.
//   Missing PR results    → infra failure (stack never produced a report), exit 1.
//   Otherwise exit 1 iff regressions were found.

import * as fs from 'fs';

const prPath = process.argv[2] ?? 'e2e/playwright-report/results.json';
const basePath = process.argv[3] ?? '.e2e-baseline/results.json';

// Map of "file › describe › … › title" → { outcome, error }. The describe
// chain matters: the same leaf title recurs across groups in one file
// (e.g. "list view renders core controls").
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
  return tests;
};

const pr = collect(prPath);
console.log('## Deterministic e2e — classified against main\n');
if (!pr) {
  console.log(
    `⚠️ **Infra failure**: no results at \`${prPath}\` — the stack never produced a report (boot failure?). See the run log and the stack-logs artifact.`
  );
  process.exit(1);
}

const baseline = collect(basePath);
const runId = process.env.BASELINE_RUN_ID;
const sha = process.env.BASELINE_SHA;

const categories = {
  regression: [],
  preExisting: [],
  newFailing: [],
  fixed: [],
  flaky: [],
  unclassified: [],
};
let prSkipped = 0;
let baseSkipped = 0;

for (const [key, t] of pr) {
  if (t.outcome === 'skipped') prSkipped++;
  const base = baseline?.get(key);
  if (t.outcome === 'unexpected') {
    if (!baseline) categories.unclassified.push({ key, t });
    else if (!base) categories.newFailing.push({ key, t });
    else if (base.outcome === 'unexpected' || base.outcome === 'skipped')
      categories.preExisting.push({
        key,
        t,
        skippedOnMain: base.outcome === 'skipped',
      });
    else categories.regression.push({ key, t });
  } else if (t.outcome === 'flaky') {
    categories.flaky.push({ key, t });
  } else if (t.outcome === 'expected' && base?.outcome === 'unexpected') {
    categories.fixed.push({ key, t });
  }
}
if (baseline)
  for (const t of baseline.values()) if (t.outcome === 'skipped') baseSkipped++;

if (baseline) {
  const from =
    runId && sha
      ? `main run [${runId}](../actions/runs/${runId}) at \`${sha.slice(0, 7)}\``
      : `\`${basePath}\``;
  console.log(`Baseline: ${from}.\n`);
} else {
  console.log(
    `_No main baseline available yet (first run since the push trigger landed?) — failures below are unclassified._\n`
  );
}

const section = (heading, entries, render) => {
  if (!entries.length) return;
  console.log(`### ${heading} (${entries.length})\n`);
  for (const e of entries) console.log(render(e));
  console.log('');
};

section(
  '❌ Regressions — passing on main, failing here',
  categories.regression,
  ({ key, t }) => `- \`${key}\`${t.error ? ` — ${t.error}` : ''}`
);
section(
  '🆕 New tests, failing — no baseline entry',
  categories.newFailing,
  ({ key }) => `- \`${key}\``
);
section(
  '⏳ Pre-existing — already failing on main',
  categories.preExisting,
  ({ key, skippedOnMain }) =>
    `- \`${key}\`${skippedOnMain ? ' _(skipped on main — its group had already aborted)_' : ''}`
);
section(
  '✅ Fixed — failing on main, passing here',
  categories.fixed,
  ({ key }) => `- \`${key}\``
);
section(
  '⚠️ Flaky — passed on retry (quarantine-or-fix policy applies)',
  categories.flaky,
  ({ key }) => `- \`${key}\``
);
section(
  'Failures (unclassified — no baseline)',
  categories.unclassified,
  ({ key, t }) => `- \`${key}\`${t.error ? ` — ${t.error}` : ''}`
);

if (prSkipped || baseSkipped)
  console.log(
    `${prSkipped} tests skipped downstream of failing serial groups${baseline ? ` (main: ${baseSkipped})` : ''}.\n`
  );

if (categories.regression.length) {
  console.log(
    `**Verdict: ❌ ${categories.regression.length} regression(s) — this job fails.**`
  );
  process.exit(1);
}
console.log(
  baseline
    ? '**Verdict: ✅ no regressions** — every failure is pre-existing or belongs to a newly added test.'
    : '**Verdict: ⬜ no baseline to compare against** — job passes; the next main run seeds the baseline.'
);
