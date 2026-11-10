/*
 * spec/PROGRESS.md-matches-the-tree check.
 *
 * PROGRESS.md says it is "derived from the tree", and every cell records
 * whether an artifact is PRESENT — not a quality judgement. Nothing enforced
 * that, so the table drifted the first time a vertical shipped without
 * touching it (PR #749 review, F10: purchase-orders was missing entirely).
 * This script re-derives the table from the tree and fails on any difference,
 * the way check_anchor_refs.py and coverage_skeleton.py --check keep the spec's
 * other derived files honest.
 *
 * The derivation is PROGRESS.md's own "What each column means" table:
 *   Spec      spec/<vertical>/ exists — README, rules, ui-surface, and
 *             contract (front end) or data (full stack)
 *   Cases     spec/<vertical>/cases/ holds at least one file
 *   Build     src/sections/<stem>/ exists
 *   e2e       e2e/specs/<stem>-regression.spec.ts exists (the stem may
 *             differ from the folder by a trailing 's': spec/stocktakes is
 *             driven by stocktake-regression.spec.ts)
 *   Workflow  exploratory/workflows/<stem>.md exists
 *   Run       exploratory/reports/<date>/<stem>-findings.md exists
 *
 * A vertical sits at any depth under spec/ and is named by its path there
 * (`procurement/plan`); its stem is that name with `-` for `/`
 * (spec-verticals.mjs). Each column reads the vertical's own folder, so a
 * nested vertical's files and cases never count for its parent.
 *
 * The Run column carries a DATE, not a tick, so the script only checks that a
 * date is present exactly when a report is (which date is the author's).
 *
 * Both lists this compares are read from PROGRESS.md itself — the cross-cutting
 * folders it says are "Not listed", and the rows it has — so adding a vertical
 * means editing one file, not two.
 *
 * It also checks that every top-level spec folder, listed or not, and every
 * nested folder with a README opens its README with a scope line
 * (`> **Scope: front end.**` or `> **Scope: full stack.**`) as the first line
 * under the heading — AUTHORING.md → Scope. Tools read it to decide whether a
 * vertical has a server leg. And no two verticals may share a stem, since
 * they would share every file named for it outside spec/.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { specFolders, stem, stemClashes } from './spec-verticals.mjs';

const FILE = '../spec/PROGRESS.md';
const SPEC_DIR = '../spec';
const SPEC_FILES = ['README.md', 'rules.md', 'ui-surface.md'];

// spec/ is not published to the public mirror (.github/mirror/rules.txt), and
// this file lives inside it, so there is nothing to check there — skip rather
// than fail, or `pnpm check` could never pass in the public repo.
if (!existsSync(FILE)) {
  console.log(`PROGRESS skipped — no ${FILE} in this tree`);
  process.exit(0);
}

const text = readFileSync(FILE, 'utf8');

// The cross-cutting folders the "Not listed" section names, read from the prose
// so the two can never disagree.
const notListed = new Set(
  (text.split('## Not listed')[1] ?? '')
    .split('##')[0]
    .match(/`([a-z0-9/-]+)`/g)
    ?.map(name => name.replaceAll('`', '')) ?? []
);
if (notListed.size === 0) {
  console.error(`${FILE}: could not read the "Not listed" section`);
  process.exit(1);
}

const dirs = path =>
  existsSync(path)
    ? readdirSync(path).filter(name => statSync(join(path, name)).isDirectory())
    : [];

const has = path => (existsSync(path) ? '✅' : '—');

// Every report file under exploratory/reports/<date>/, as "<date>/<file>".
const reports = dirs('exploratory/reports').flatMap(date =>
  readdirSync(join('exploratory/reports', date)).map(name => `${date}/${name}`)
);

const derive = ({ name, dir, scope }) => {
  const named = stem(name);
  // The suite is named for the vertical, give or take a plural.
  const suiteStems = [named, named.replace(/s$/, ''), `${named}s`];
  // A full-stack vertical decides its tables in data.md and has no contract.md.
  const contract = scope === 'full stack' ? 'data.md' : 'contract.md';
  return {
    spec: [...SPEC_FILES, contract].every(f => existsSync(join(dir, f)))
      ? '✅'
      : '—',
    cases:
      existsSync(join(dir, 'cases')) &&
      readdirSync(join(dir, 'cases')).length > 0
        ? '✅'
        : '—',
    build: has(join('src/sections', named)),
    e2e: suiteStems.some(suite =>
      existsSync(join('e2e/specs', `${suite}-regression.spec.ts`))
    )
      ? '✅'
      : '—',
    workflow: has(join('exploratory/workflows', `${named}.md`)),
    // The report's exact name, not a substring: `reports` would otherwise
    // claim manage-reports-findings.md.
    run: reports.some(r => r.endsWith(`/${named}-findings.md`)),
  };
};

// The table's rows: | [`name`](./name/) | ✅ | … | <run> |, a nested
// vertical's name holding its path (`procurement/plan`).
const rows = new Map();
for (const line of text.split('\n')) {
  const match = /^\|\s*\[`([a-z0-9/-]+)`\]\([^)]*\)\s*\|(.+)\|\s*$/.exec(line);
  if (!match) continue;
  const cells = match[2].split('|').map(c => c.trim());
  if (cells.length !== 6) continue;
  rows.set(match[1], {
    spec: cells[0],
    cases: cells[1],
    build: cells[2],
    e2e: cells[3],
    workflow: cells[4],
    run: cells[5],
  });
}

const folders = specFolders(SPEC_DIR);
const listed = folders.filter(
  ({ name, scope }) => scope !== null && !notListed.has(name)
);
const verticals = listed.map(({ name }) => name);
const problems = [];

for (const folder of listed) {
  const vertical = folder.name;
  const row = rows.get(vertical);
  if (!row) {
    problems.push(`${vertical}: in spec/ but has no row`);
    continue;
  }
  const want = derive(folder);
  for (const column of ['spec', 'cases', 'build', 'e2e', 'workflow']) {
    if (row[column] !== want[column])
      problems.push(
        `${vertical}: ${column} reads ${row[column] || '(blank)'}, the tree says ${want[column]}`
      );
  }
  const hasDate = row.run !== '—' && row.run !== '';
  if (hasDate !== want.run)
    problems.push(
      want.run
        ? `${vertical}: a report is on file but Run reads ${row.run || '(blank)'}`
        : `${vertical}: Run reads ${row.run} but no report names it`
    );
}

for (const row of rows.keys())
  if (!verticals.includes(row))
    problems.push(
      `${row}: has a row but no spec/${row}/ (or it is "Not listed")`
    );

const scopeProblems = folders
  .filter(({ scope }) => scope === null)
  .map(({ name, readme }) =>
    readme
      ? `${name}: README.md has no scope line under its heading`
      : `${name}: no README.md`
  );

const clashes = stemClashes(folders.filter(({ scope }) => scope !== null));

if (problems.length > 0) {
  console.error(`${FILE} does not match the tree:\n  ${problems.join('\n  ')}`);
  console.error(
    `\nTick the cell in the PR that delivers the step (see "Keeping it true").`
  );
}
if (scopeProblems.length > 0)
  console.error(
    `Spec folders without a scope line:\n  ${scopeProblems.join('\n  ')}\n\n` +
      'Open the README with `> **Scope: front end.**` or `> **Scope: full stack.**` (see spec/AUTHORING.md → Scope).'
  );
if (clashes.length > 0)
  console.error(
    `Verticals sharing a stem:\n  ${clashes.join('\n  ')}\n\n` +
      'Rename one of them (see spec/AUTHORING.md → Nested verticals).'
  );
if (problems.length > 0 || scopeProblems.length > 0 || clashes.length > 0)
  process.exit(1);

console.log(
  `PROGRESS OK — ${verticals.length} vertical(s), every cell matches the tree; every spec folder declares its scope`
);
