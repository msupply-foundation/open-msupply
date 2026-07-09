/*
 * Pages-compose-never-style check (see kdd/page-composition).
 *
 * Real pages (src/pages/) assemble library components; the Page frame owns
 * inter-region geometry and each region component owns its own look, so a
 * page has nowhere it NEEDS to write CSS — and a page that wants some is a
 * signal that a library component or token is missing. This script fails if
 * any CSS file exists under src/pages/ outside the allowlist.
 *
 * Allowlist: bespoke one-off surfaces argued case-by-case in kdd/page-composition
 * (Login's gradient hero is the precedent). Add a page dir here ONLY with a
 * KDD entry to point at.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const PAGES_DIR = 'src/pages';
const ALLOW = new Set(['Login']); // top-level page dirs allowed to own CSS

// No src/pages/ right now (verticals live in src/sections/) — nothing to check.
if (!existsSync(PAGES_DIR)) {
  console.log(`page CSS OK — no ${PAGES_DIR} directory yet`);
  process.exit(0);
}

const cssFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith('.css')) cssFiles.push(path);
  }
};
walk(PAGES_DIR);

const offenders = cssFiles.filter(
  (path) => !ALLOW.has(relative(PAGES_DIR, path).split(sep)[0])
);

if (offenders.length) {
  console.error(
    `pages own no CSS (kdd/page-composition) — pages compose library components; ` +
      `if a page needs styling, a library component or token is missing.\n` +
      `Offending file(s):\n  ${offenders.join('\n  ')}\n` +
      `(Bespoke one-off pages can be allowlisted in scripts/check-page-css.mjs ` +
      `with a kdd/page-composition entry.)`
  );
  process.exit(1);
}
console.log(
  `page CSS OK — ${cssFiles.length} CSS file(s) under ${PAGES_DIR}, all allowlisted (${[...ALLOW].join(', ')})`
);
