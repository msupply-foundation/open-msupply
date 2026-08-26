#!/usr/bin/env node
// Render a Playwright results.json (e2e/playwright.config.ts json reporter)
// as a markdown report on stdout — CI appends it to $GITHUB_STEP_SUMMARY.
//
// The report is for humans triaging a spec build, so each failure is
// classified by what kind of follow-up it needs:
//   contract gap      — timed out waiting for a getByTestId locator: the id
//                       never rendered (TESTIDS.md / IMPLEMENTING C8);
//                       fix is placing the id, not spec work.
//   behaviour mismatch — the element was found but an assertion failed: the
//                       built app disagrees with the current app; triage
//                       against spec/ (reverse-spec fix or recorded
//                       divergence).
//   infra             — auth.setup.ts / data.setup.ts failed: the stack or
//                       login is broken and downstream results are noise.
//
// Usage: node scripts/e2e/render-e2e-report.mjs [path/to/results.json]

import * as fs from 'fs';

const resultsPath = process.argv[2] ?? 'e2e/playwright-report/results.json';
if (!fs.existsSync(resultsPath)) {
  console.log(`## Deterministic e2e report\n`);
  console.log(
    `⚠️ No results.json at \`${resultsPath}\` — the suite run itself did not produce a report (stack failed to boot?). See the run logs and stack-logs artifact.`
  );
  process.exit(0);
}
const report = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

// ---- collect every test, depth-first --------------------------------------
const tests = [];
const walk = suite => {
  for (const child of suite.suites ?? []) walk(child);
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const lastRun = t.results?.[t.results.length - 1];
      tests.push({
        file: spec.file,
        title: spec.title,
        // t.status is the outcome vs expectations: expected | unexpected |
        // flaky | skipped
        outcome: t.status,
        covers: (t.annotations ?? [])
          .filter(a => a.type === 'covers')
          .flatMap(a => (a.description ?? '').split(',').map(s => s.trim()))
          .filter(Boolean),
        error: lastRun?.errors?.[0]?.message ?? '',
      });
    }
  }
};
walk(report);

// ---- classify failures -----------------------------------------------------
const TESTID_WAIT = /waiting for .*getByTestId\(['"]([^'"]+)['"]\)/s;
const classify = t => {
  if (/\.setup\.ts$/.test(t.file)) return 'infra';
  const m = t.error.match(TESTID_WAIT);
  if (m) return `contract gap (\`${m[1]}\`)`;
  return 'behaviour mismatch';
};

const failed = tests.filter(t => t.outcome === 'unexpected');
const passed = tests.filter(t => t.outcome === 'expected');
const flaky = tests.filter(t => t.outcome === 'flaky');
const skipped = tests.filter(t => t.outcome === 'skipped');
for (const t of failed) t.class = classify(t);

// ---- behaviour-ID rollup (the `covers` annotations) ------------------------
const byBehaviour = new Map();
for (const t of tests) {
  for (const id of t.covers) {
    const cur = byBehaviour.get(id) ?? { pass: 0, fail: 0 };
    if (t.outcome === 'expected' || t.outcome === 'flaky') cur.pass++;
    else if (t.outcome === 'unexpected') cur.fail++;
    byBehaviour.set(id, cur);
  }
}
const behaviourIds = [...byBehaviour.keys()].sort();
const passingIds = behaviourIds.filter(id => {
  const { pass, fail } = byBehaviour.get(id);
  return pass > 0 && fail === 0;
});
const failingIds = behaviourIds.filter(id => byBehaviour.get(id).fail > 0);

// ---- render ----------------------------------------------------------------
const md = (s = '') => (s === '' ? ' ' : s.replace(/\|/g, '\\|'));
const firstLine = e =>
  e
    .split('\n')
    // eslint-disable-next-line no-control-regex
    .map(l => l.replace(/\[\d+m/g, '').trim())
    .find(l => l && !l.startsWith('=')) ?? '';
const meta = report.metadata ?? {};
const infraDown = failed.some(t => t.class === 'infra');

const lines = [];
lines.push(`## Deterministic e2e report`);
lines.push('');
const provenance = ['branch', 'commit', 'App version', 'PR']
  .filter(k => meta[k])
  .map(k => `${k}: \`${meta[k]}\``)
  .join(' · ');
if (provenance) lines.push(provenance, '');
lines.push(
  `**${passed.length} passed** · **${failed.length} failed** · ${flaky.length} flaky · ${skipped.length} skipped` +
    ` — behaviour IDs: **${passingIds.length}/${behaviourIds.length} passing**`
);
lines.push('');
if (infraDown) {
  lines.push(
    `> ⚠️ **Setup failed** — login or data seeding broke, so downstream skips/failures say nothing about the app. Fix the stack first.`
  );
  lines.push('');
}
if (failed.length) {
  lines.push(`### Failures`);
  lines.push('');
  lines.push(`| test | covers | class | error |`);
  lines.push(`| --- | --- | --- | --- |`);
  for (const t of failed) {
    lines.push(
      `| ${md(`${t.file} › ${t.title}`)} | ${md(t.covers.join(', '))} | ${md(t.class)} | ${md(firstLine(t.error))} |`
    );
  }
  lines.push('');
}
if (failingIds.length) {
  lines.push(
    `Behaviour IDs failing: ${failingIds.map(id => `\`${id}\``).join(', ')}`
  );
  lines.push('');
}
if (passed.length || skipped.length || flaky.length) {
  lines.push(`<details><summary>All ${tests.length} tests</summary>`);
  lines.push('');
  lines.push(`| status | test | covers |`);
  lines.push(`| --- | --- | --- |`);
  const icon = {
    expected: '✅',
    unexpected: '❌',
    flaky: '⚠️',
    skipped: '⏭️',
  };
  for (const t of tests) {
    lines.push(
      `| ${icon[t.outcome] ?? t.outcome} | ${md(`${t.file} › ${t.title}`)} | ${md(t.covers.join(', '))} |`
    );
  }
  lines.push('');
  lines.push(`</details>`);
}
console.log(lines.join('\n'));
