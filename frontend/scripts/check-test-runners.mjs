/*
 * Every test file is run by something.
 *
 * A test file that no runner collects does not fail — it disappears. The suite
 * stays green, the file stays in the tree, and the guarantee it was written to
 * hold is simply absent. That is how `codegen/__tests__` sat unrun: 96
 * assertions with a `test:codegen` script and no CI step to call it (#819).
 *
 * This script closes the loop from the other end. It reads the runners' OWN
 * configuration — it keeps no second copy of the globs — lists every test file
 * under frontend/, and fails if one is collected by no runner. It also fails
 * when a runner has no step in the workflow that is supposed to invoke it,
 * which is the shape the codegen gap had: a runner that exists, works, and is
 * never asked to run.
 *
 * A glob matching nothing is reported but not failed: it is usually a suite
 * that moved (leaving its files unmatched, which DOES fail above) or simply a
 * project with nothing of that extension yet.
 *
 * Run via `pnpm check`.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { matchesGlob } from 'node:path';

const read = f => readFileSync(f, 'utf8');

// Comments hold example globs and prose brackets; strip them before
// pattern-matching config source so neither is mistaken for configuration.
// Both forms are anchored to the start of a line, because an unanchored
// block-comment pattern eats the `/**/` in the middle of `src/**/*.test.ts`.
const stripComments = s =>
  s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '').replace(/^[ \t]*\/\/.*$/gm, '');

const quoted = s => [...s.matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);

// The array body from `[` to its matching `]`. Counting depth rather than
// reaching for the next `]` is what lets a character class inside a glob
// (`?(c|m)[jt]s?(x)`) survive the parse.
const bracketed = (src, from) => {
  const open = src.indexOf('[', from);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']' && --depth === 0) return src.slice(open + 1, i);
  }
  return null;
};

const includeGlobs = file => {
  const src = stripComments(read(file));
  const globs = [];
  for (const m of src.matchAll(/\binclude:\s*\[/g)) {
    const body = bracketed(src, m.index);
    if (body) globs.push(...quoted(body));
  }
  return globs;
};

// --- What the runners actually collect ---------------------------------

// vitest.config.ts is the root project; vitest.workspace.ts adds one
// `include` per further project (`solid`, `backend-plugins`). Reading every
// `include` in both means a project added later is picked up without editing
// this script.
const vitestGlobs = () => [
  ...includeGlobs('vitest.config.ts'),
  ...includeGlobs('vitest.workspace.ts'),
];

// `test:codegen` is `node --test "<glob>"`; node's test runner expands it.
const codegenGlobs = () => {
  const script = JSON.parse(read('package.json')).scripts['test:codegen'];
  if (!script) throw new Error('package.json: no `test:codegen` script');
  return quoted(script);
};

// Playwright collects `testDir` with its default testMatch. testDir is
// relative to the config file, which lives in e2e/.
const playwrightGlobs = () => {
  const src = stripComments(read('e2e/playwright.config.ts'));
  const m = /\btestDir:\s*['"]([^'"]+)['"]/.exec(src);
  if (!m) throw new Error('e2e/playwright.config.ts: could not find `testDir`');
  const dir = `e2e/${m[1].replace(/^\.\//, '').replace(/\/$/, '')}`;
  return [`${dir}/**/*.@(spec|test).?(c|m)[jt]s?(x)`];
};

const RUNNERS = [
  {
    name: 'vitest (`pnpm test`)',
    globs: vitestGlobs(),
    // Anchored: a bare `includes('pnpm test')` is also satisfied by a
    // `pnpm test:codegen` step, which would let this runner go unwired.
    ci: {
      workflow: 'frontend-check-test.yaml',
      command: 'pnpm test',
      step: /^[ \t]*run:[ \t]*pnpm test[ \t]*$/m,
    },
  },
  {
    name: "node's test runner (`pnpm test:codegen`)",
    globs: codegenGlobs(),
    ci: {
      workflow: 'frontend-check-test.yaml',
      command: 'pnpm test:codegen',
      step: /^[ \t]*run:[ \t]*pnpm test:codegen[ \t]*$/m,
    },
  },
  {
    name: 'Playwright (`pnpm e2e`)',
    globs: playwrightGlobs(),
    // The nightly legs call the wrapper script rather than the pnpm alias.
    ci: {
      workflow: 'frontend-e2e-nightly.yaml',
      command: 'scripts/e2e/run-e2e.sh',
      step: /scripts\/e2e\/run-e2e\.sh/,
    },
  },
];

// Files no runner collects ON PURPOSE. Each needs a reason, so that "nothing
// runs this" is a decision on the record rather than the default.
const EXCLUDED = [];

// --- The files ----------------------------------------------------------

// Tracked files plus new, un-ignored ones, so a test file added in the working
// tree is checked before it is staged rather than after it lands. git also
// keeps node_modules and every build output out of the list for free.
const testFiles = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8' }
)
  .split('\n')
  .filter(f => /\.(test|spec)\.[^/]+$/.test(f));

const failures = [];

const unmatched = testFiles.filter(
  f =>
    !RUNNERS.some(r => r.globs.some(g => matchesGlob(f, g))) &&
    !EXCLUDED.some(e => matchesGlob(f, e.glob))
);
if (unmatched.length) {
  failures.push(
    `${unmatched.length} test file(s) are collected by no runner, so they never execute:\n  ${unmatched.join('\n  ')}\n` +
      '\nAdd a glob that covers them to the runner that should own them, or add\n' +
      'an exclusion with a reason to EXCLUDED in this script.'
  );
}

// --- Wired into CI ------------------------------------------------------

for (const { name, ci } of RUNNERS) {
  let workflow;
  try {
    workflow = read(`../.github/workflows/${ci.workflow}`);
  } catch {
    failures.push(`${name}: ${ci.workflow} does not exist.`);
    continue;
  }
  if (!ci.step.test(workflow)) {
    failures.push(
      `${name} has no step in ${ci.workflow} — nothing runs '${ci.command}', so its suites are green by default. Add the step, or point this check at the workflow that does run it.`
    );
  }
}

// --- Report -------------------------------------------------------------

if (failures.length) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}

for (const { name, globs } of RUNNERS) {
  for (const g of globs) {
    if (!testFiles.some(f => matchesGlob(f, g))) {
      console.warn(`check-test-runners: ${name} — '${g}' matches no file.`);
    }
  }
}
console.log(
  `check-test-runners: ${testFiles.length} test files, all collected by a runner.`
);
