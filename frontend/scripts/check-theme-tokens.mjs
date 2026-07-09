/*
 * Theme-contract check (see src/ui/docs/DECISIONS.md 2026-07-06).
 *
 * tokens.css delimits a "theme contract" region inside :root with
 * `@theme-contract:start` / `@theme-contract:end` comment markers. This script
 * enforces, for every `[data-theme]` block in the file:
 *
 *   1. COMPLETENESS — every contract token is overridden (catches the
 *      prototype's dark-theme bug where --input-border was missed);
 *   2. NO STRAYS — the block only overrides tokens declared in the contract
 *      (catches typos and overrides of static/nonexistent tokens).
 *
 * Exit code 1 with a per-theme report on failure. Run via `npm run check`.
 */
import { readFileSync } from 'node:fs';

const TOKENS_FILE = 'src/ui/styles/tokens.css';
const css = readFileSync(TOKENS_FILE, 'utf8');

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const tokenNames = (block) =>
  new Set([...stripComments(block).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));

// --- Contract region ---------------------------------------------------
const start = css.indexOf('@theme-contract:start');
const end = css.indexOf('@theme-contract:end');
if (start === -1 || end === -1 || end < start) {
  console.error(
    `${TOKENS_FILE}: missing or malformed @theme-contract:start/end markers`
  );
  process.exit(1);
}
const contract = tokenNames(css.slice(start, end));
if (contract.size === 0) {
  console.error(`${TOKENS_FILE}: theme contract region declares no tokens`);
  process.exit(1);
}

// --- Theme blocks ------------------------------------------------------
// Declaration blocks contain no nested braces, so "next }" ends the block.
const themeBlocks = [
  ...css.matchAll(/\[data-theme=(?:'([^']+)'|"([^"]+)")\]\s*\{([^}]*)\}/g),
].map((m) => ({ theme: m[1] ?? m[2], tokens: tokenNames(m[3]) }));

if (themeBlocks.length === 0) {
  console.error(`${TOKENS_FILE}: no [data-theme] blocks found`);
  process.exit(1);
}

// --- Report ------------------------------------------------------------
let failed = false;
for (const { theme, tokens } of themeBlocks) {
  const missing = [...contract].filter((t) => !tokens.has(t));
  const strays = [...tokens].filter((t) => !contract.has(t));
  if (missing.length) {
    failed = true;
    console.error(
      `[data-theme='${theme}'] is missing ${missing.length} contract token(s):\n  ${missing.join('\n  ')}`
    );
  }
  if (strays.length) {
    failed = true;
    console.error(
      `[data-theme='${theme}'] overrides token(s) not in the theme contract (typo, or a static token?):\n  ${strays.join('\n  ')}`
    );
  }
}

if (failed) process.exit(1);
console.log(
  `theme contract OK — ${contract.size} tokens × ${themeBlocks.length} theme(s) (${themeBlocks.map((b) => b.theme).join(', ')})`
);
