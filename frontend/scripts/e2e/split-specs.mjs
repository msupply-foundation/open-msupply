#!/usr/bin/env node
/*
 * Spread the e2e spec files across N servers, balanced by how long each file
 * took last time — so the split follows the suites as they grow, with no list
 * to maintain. run-e2e.sh calls it twice:
 *
 *   assign  <list.json> <servers>   before the run: reads Playwright's
 *                                    `--list --reporter=json` output (so CLI
 *                                    filters select files exactly as they do
 *                                    for the run itself) and prints a JSON
 *                                    array, one array of spec files (relative
 *                                    to e2e/specs) per server.
 *   record  <results.json>          after the run: folds each fully-run
 *                                    file's duration into the timings file.
 *
 * Timings live in e2e/.spec-timings.json (gitignored, per checkout). A file
 * with no recorded timing — a new suite, or a fresh checkout — is estimated
 * from its test count at the median seconds-per-test of the files that do
 * have one, so the first run already splits sensibly and the next one
 * splits on measured time. Assignment is greedy longest-first onto the
 * least-loaded server: a single suite never straddles servers, so the run
 * can't finish faster than its slowest file.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TIMINGS = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../e2e/.spec-timings.json'
);
const DEFAULT_SECONDS_PER_TEST = 2;
// Projects that run once per server rather than holding spec files —
// `setup` / `data-setup`, or `setup-<n>` / `data-setup-<n>` per server.
const SETUP_PROJECT = /^(data-)?setup(-\d+)?$/;

const readTimings = () =>
  existsSync(TIMINGS)
    ? (JSON.parse(readFileSync(TIMINGS, 'utf8')).files ?? {})
    : {};

// { file: { tests, seconds } } from a Playwright JSON report or list, for
// the non-setup projects. `seconds` sums every result (retries included —
// they cost wall time too).
const perFile = report => {
  const files = {};
  const walk = suite => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        if (SETUP_PROJECT.test(test.projectName)) continue;
        const entry = (files[spec.file] ??= {
          tests: 0,
          seconds: 0,
          unrun: 0,
        });
        entry.tests += 1;
        const results = test.results ?? [];
        if (results.length === 0) entry.unrun += 1;
        entry.seconds +=
          results.reduce((sum, r) => sum + (r.duration ?? 0), 0) / 1000;
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return files;
};

const median = values => {
  if (values.length === 0) return DEFAULT_SECONDS_PER_TEST;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const assign = (listPath, servers) => {
  const files = perFile(JSON.parse(readFileSync(listPath, 'utf8')));
  const timings = readTimings();
  const rate = median(
    Object.values(timings)
      .filter(t => t.tests > 0)
      .map(t => t.seconds / t.tests)
  );
  const weighted = Object.entries(files)
    .map(([file, { tests }]) => ({
      file,
      seconds: timings[file]?.seconds ?? tests * rate,
    }))
    .sort((a, b) => b.seconds - a.seconds || a.file.localeCompare(b.file));
  const count = Math.max(1, Math.min(servers, weighted.length));
  const bins = Array.from({ length: count }, () => ({ seconds: 0, files: [] }));
  for (const { file, seconds } of weighted) {
    const lightest = bins.reduce((min, bin) =>
      bin.seconds < min.seconds ? bin : min
    );
    lightest.files.push(file);
    lightest.seconds += seconds;
  }
  for (const [i, bin] of bins.entries()) {
    console.error(
      `  server ${i + 1}: ${bin.files.length} file(s), ~${Math.round(bin.seconds)}s`
    );
  }
  process.stdout.write(JSON.stringify(bins.map(bin => bin.files)));
};

const record = resultsPath => {
  if (!existsSync(resultsPath)) return;
  const files = perFile(JSON.parse(readFileSync(resultsPath, 'utf8')));
  const timings = readTimings();
  let updated = 0;
  for (const [file, { tests, seconds, unrun }] of Object.entries(files)) {
    // Only a file whose every test ran says how long the file takes; a
    // filtered or interrupted run would record a misleadingly short time.
    if (unrun > 0) continue;
    timings[file] = { tests, seconds: Math.round(seconds * 10) / 10 };
    updated += 1;
  }
  writeFileSync(TIMINGS, `${JSON.stringify({ files: timings }, null, 2)}\n`);
  console.error(`spec timings: ${updated} file(s) updated in ${TIMINGS}`);
};

const [command, ...args] = process.argv.slice(2);
if (command === 'assign' && args.length === 2) assign(args[0], Number(args[1]));
else if (command === 'record' && args.length === 1) record(args[0]);
else {
  console.error(
    'usage: split-specs.mjs assign <list.json> <servers> | record <results.json>'
  );
  process.exit(2);
}
