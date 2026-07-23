/*
 * Minimum-browser consistency check (spec/startup/rules.md § Minimum
 * browser, AC-BR6).
 *
 * The Chromium floor is declared in two places that cannot share a
 * constant — package.json's browserslist (read by the stylelint/eslint
 * plugins) and the pre-boot warning script inlined in index.html. This
 * script fails when they disagree, so the floor is one decision, not two.
 * Deliberately NOT checked: a Vite build target — the floor is
 * warn-don't-block, so the bundle keeps Vite's conservative default and
 * stays runnable on engines below the floor. Exit code 1 with a report on
 * failure. Run via `npm run check`.
 */
import { readFileSync } from 'node:fs';

const read = file => readFileSync(file, 'utf8');

const declared = [
  {
    file: 'package.json',
    pattern: /"chrome >= (\d+)"/,
    what: 'browserslist query',
  },
  {
    file: 'index.html',
    pattern: /MIN_CHROMIUM = (\d+)/,
    what: 'runtime warning threshold',
  },
].map(({ file, pattern, what }) => {
  const match = read(file).match(pattern);
  if (!match) {
    console.error(`${file}: ${what} not found (expected ${pattern})`);
    process.exit(1);
  }
  return { file, what, version: Number(match[1]) };
});

const versions = new Set(declared.map(d => d.version));
if (versions.size > 1) {
  console.error(
    `minimum browser versions disagree:\n${declared
      .map(d => `  ${d.file} (${d.what}): ${d.version}`)
      .join('\n')}`
  );
  process.exit(1);
}

console.log(
  `minimum browser OK — Chromium ${declared[0].version} in ${declared.length} places`
);
