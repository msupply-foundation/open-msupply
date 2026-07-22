/*
 * Spec-build coverage report (report-only — always exits 0).
 *
 * After an on-demand spec build, answers "did a build actually happen?" for
 * the requested verticals, in markdown on stdout (the workflow appends it to
 * the job summary). For every requested vertical it reports whether
 * src/sections/<vertical>/ exists on HEAD, and — because the wipe commit
 * leaves the deleted files one git command away — whether the tree is
 * byte-identical to the pre-wipe baseline, which means it was restored from
 * history rather than regenerated from spec (the run-29715356539 failure
 * mode). The reference implementation is exempt: the wipe keeps it by
 * design. Verticals in spec/README.md that were NOT requested are expected
 * to be untouched by this run and are reported informationally, never as a
 * failure. Also flags a missing BUILD_REPORT.md (the spec-build skill's Done
 * bar).
 *
 * Usage: node scripts/spec-build-coverage.mjs <baseline-sha> <requested-csv>
 *   baseline-sha  — pre-wipe main (the workflow's source_sha output).
 *   requested-csv — comma-separated verticals the run was scoped to (the
 *                   workflow's steps.verticals.outputs.csv).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const baseline = process.argv[2];
if (!baseline) {
  console.log('spec coverage: no baseline SHA given — skipping report.');
  process.exit(0);
}
const requested = new Set(
  (process.argv[3] ?? '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
);

// The "## Verticals" section of spec/README.md, bullets like
// "- [`stocktakes/`](./stocktakes/) — … **(reference implementation)**".
const readme = readFileSync('spec/README.md', 'utf8');
const section = readme.split(/^## Verticals$/m)[1]?.split(/^## /m)[0] ?? '';
const verticals = [...section.matchAll(/^- \[`([\w-]+)\/`\][^\n]*/gm)].map(
  ([line, name]) => ({
    name,
    isReference: /\(reference implementation\)/.test(line),
  })
);

console.log('## Spec-build coverage\n');
if (!verticals.length) {
  console.log(
    '⚠️ No verticals parsed from spec/README.md → Verticals — the section format may have changed; fix scripts/spec-build-coverage.mjs.'
  );
  process.exit(0);
}
console.log(`Baseline (pre-wipe main): \`${baseline}\`\n`);
console.log('| Vertical | `src/sections/` | Verdict |');
console.log('| --- | --- | --- |');

const identicalToBaseline = name => {
  try {
    execFileSync('git', [
      'diff',
      '--quiet',
      baseline,
      'HEAD',
      '--',
      `src/sections/${name}`,
    ]);
    return true;
  } catch {
    return false;
  }
};

let failures = 0;
for (const { name, isReference } of verticals) {
  const present = existsSync(`src/sections/${name}`);
  let verdict;
  if (isReference) {
    verdict = present
      ? 'reference implementation — kept, not a rebuild target'
      : '❌ missing — the wipe must keep the reference implementation';
  } else if (!requested.has(name)) {
    verdict = 'out of scope — untouched by this run';
  } else if (!present) {
    verdict = '❌ not built';
  } else if (identicalToBaseline(name)) {
    verdict =
      '❌ byte-identical to baseline — restored from git history, not rebuilt';
  } else {
    verdict = '✅ rebuilt';
  }
  if (verdict.startsWith('❌')) failures += 1;
  console.log(`| ${name} | ${present ? 'present' : 'missing'} | ${verdict} |`);
}

console.log('');
console.log(
  existsSync('BUILD_REPORT.md')
    ? '`BUILD_REPORT.md`: ✅ present'
    : "`BUILD_REPORT.md`: ❌ missing — the spec-build skill's Done bar requires it"
);
if (failures) {
  console.log(
    `\n⚠️ ${failures} of ${requested.size} requested verticals did not get an honest rebuild. This report never fails the job — triage via the branch and the spec-build-claude-transcript artifact.`
  );
}
