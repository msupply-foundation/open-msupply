/*
 * e2e test-import check (e2e/test.ts).
 *
 * Every spec imports `test` from e2e/test.ts, which is Playwright's `test`
 * with the remount check on every page (e2e/helpers/remountCheck.ts). A spec
 * that imports `test` from '@playwright/test' instead still runs and still
 * passes — it just isn't checked, which is how a field that loses focus after
 * one keystroke gets through. This script fails on any such import under
 * e2e/specs/. Type-only imports from '@playwright/test' (`Page`, `Locator`)
 * are fine, and so are the helpers, which use `test.info()` but define no
 * tests. Exit code 1 with a report on failure. Run via `pnpm check`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'e2e/specs';
// Every value import from '@playwright/test', single- or multi-line.
const IMPORT = /import\s+(type\s+)?\{([^}]*)\}\s*from\s*'@playwright\/test'/g;
const TEST = /^test(\s+as\s+\w+)?$/;

const files = [];
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) files.push(path);
  }
};
walk(ROOT);

const offences = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(IMPORT)) {
    if (match[1]) continue;
    const names = match[2].split(',').map(name => name.trim());
    if (!names.some(name => TEST.test(name))) continue;
    const line = source.slice(0, match.index).split('\n').length;
    const rel = relative('.', file).split('\\').join('/');
    offences.push(`  ${rel}:${line}`);
  }
}

if (offences.length) {
  console.error(
    `e2e specs import \`test\` from '@playwright/test', which skips the remount check — import it from e2e/test.ts:\n${offences.join('\n')}`
  );
  process.exit(1);
}

console.log(
  `e2e test import OK — ${files.length} file(s), every spec uses e2e/test.ts`
);
