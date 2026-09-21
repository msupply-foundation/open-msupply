/*
 * Reduced-motion check (CLAUDE.md principle #9 — WCAG 2.2 SC 2.3.3).
 *
 * `prefers-reduced-motion` used to be honoured component by component: ~20 CSS
 * modules each ended in their own `@media (prefers-reduced-motion: reduce)`
 * block, and five (MenuBar, Select, Combobox, MultiSelect, StoreSelector) had
 * simply never grown one — nothing said they had to. Per-component opt-in makes
 * the a11y baseline a thing each new component must remember.
 *
 * So motion moved into the token layer: every duration and delay comes from a
 * --motion-* token, and tokens.css zeroes the decorative ones once under the
 * reduce query. This script holds that line, with three checks:
 *
 *   1. TOKEN COMPLETENESS — every token declared in tokens.css's
 *      @motion-decorative region is overridden in its reduce block, and that
 *      block only touches known --motion-* tokens (typo guard).
 *   2. NO LITERAL DURATIONS — no CSS file outside tokens.css writes a non-zero
 *      time in a transition/animation duration or delay. A literal is motion
 *      that the reduce block cannot reach.
 *   3. NO SMOOTH SCROLL — `scroll-behavior: smooth` has no duration to token-
 *      ise, so it's simply not allowed (JS callers use smoothScrollOptions()
 *      from ui/utils/createMediaQuery, which drops it under reduced motion).
 *
 * Components may still add a reduce block of their own — to stop a LOOPING
 * animation (a 0s duration would pin it to one keyframe) or to suppress a
 * displacement outright rather than make it instant. Those blocks are exempt
 * from check 2, since a rule inside the reduce query is by definition reached.
 *
 * Exit code 1 with a file:line report on failure. Run via `pnpm check`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/* Host source PLUS the in-repo plugins (the reference ones under
   plugins/examples/ included): a plugin ships self-contained CSS styled by the
   host's tokens (spec/plugins/sdk-contract § styling), so a literal duration
   there escapes the token reduce block exactly as one in src/ would. */
const CSS_DIRS = ['src', 'plugins'];
const TOKENS_FILE = 'src/ui/styles/tokens.css';
const REDUCE_QUERY = 'prefers-reduced-motion';

/* Blank comments out but keep every newline, so reported line numbers hold. */
const blankComments = css =>
  css.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '));

const lineOf = (css, index) => css.slice(0, index).split('\n').length;

const errors = [];

// --- 1. Token completeness ---------------------------------------------
const tokensCss = blankComments(readFileSync(TOKENS_FILE, 'utf8'));

// The markers live in comments (blanked above), so locate them in the raw text
// and slice the blanked copy at the same offsets.
const raw = readFileSync(TOKENS_FILE, 'utf8');
const start = raw.indexOf('@motion-decorative:start');
const end = raw.indexOf('@motion-decorative:end');
if (start === -1 || end === -1 || end < start) {
  console.error(
    `${TOKENS_FILE}: missing or malformed @motion-decorative:start/end markers ` +
      `— they delimit the durations that reduced motion zeroes.`
  );
  process.exit(1);
}

const decorative = [
  ...tokensCss.slice(start, end).matchAll(/(--motion-[\w-]+)\s*:/g),
].map(m => m[1]);
if (decorative.length === 0) {
  console.error(
    `${TOKENS_FILE}: the @motion-decorative region declares no --motion-* tokens.`
  );
  process.exit(1);
}

const allMotionTokens = new Set(
  [...tokensCss.matchAll(/(--motion-[\w-]+)\s*:/g)].map(m => m[1])
);

const reduceBlock = tokensCss.match(
  new RegExp(`@media[^{]*${REDUCE_QUERY}[^{]*\\{[^{]*\\{([^}]*)\\}`)
);
if (!reduceBlock) {
  console.error(
    `${TOKENS_FILE}: no @media (${REDUCE_QUERY}: reduce) block — the whole app's ` +
      `reduced-motion behaviour lives there.`
  );
  process.exit(1);
}
const reduced = new Set(
  [...reduceBlock[1].matchAll(/(--motion-[\w-]+)\s*:/g)].map(m => m[1])
);

const unreduced = decorative.filter(token => !reduced.has(token));
if (unreduced.length) {
  errors.push(
    `${TOKENS_FILE}: ${unreduced.length} decorative motion token(s) are not ` +
      `overridden in the ${REDUCE_QUERY} block (they'd keep animating):\n  ` +
      unreduced.join('\n  ')
  );
}
const unknown = [...reduced].filter(token => !allMotionTokens.has(token));
if (unknown.length) {
  errors.push(
    `${TOKENS_FILE}: the ${REDUCE_QUERY} block overrides ${unknown.length} ` +
      `token(s) that aren't declared (renamed, or a typo?):\n  ` +
      unknown.join('\n  ')
  );
}

// --- 2 & 3. Per-file scan ---------------------------------------------
const cssFiles = [];
const walk = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // Only authored CSS: a plugin dir may hold installed deps or built output.
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith('.css')) cssFiles.push(path);
  }
};
CSS_DIRS.forEach(walk);

/*
 * Ranges covered by a `prefers-reduced-motion` media query — brace-matched from
 * the `{` that opens it, so nested rules inside count as covered.
 */
const reduceRanges = css => {
  const ranges = [];
  for (const match of css.matchAll(
    new RegExp(`@media[^{]*${REDUCE_QUERY}[^{]*\\{`, 'g')
  )) {
    let depth = 0;
    for (let i = match.index + match[0].length - 1; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && --depth === 0) {
        ranges.push([match.index, i]);
        break;
      }
    }
  }
  return ranges;
};

/* A duration is fine if it is zero — `visibility 0s` carries no motion. */
const NON_ZERO_TIME = /(?<![\w.-])(\d+\.?\d*|\.\d+)(ms|s)(?![\w-])/g;
const isZero = value => Number.parseFloat(value) === 0;

const TIMED_DECL =
  /(transition|animation)(-duration|-delay)?\s*:\s*([^;}]*)[;}]/g;

for (const file of cssFiles) {
  if (file === TOKENS_FILE) continue; // where the literals are DEFINED
  const css = blankComments(readFileSync(file, 'utf8'));
  const covered = reduceRanges(css);
  const isCovered = index =>
    covered.some(([from, to]) => index >= from && index <= to);

  for (const decl of css.matchAll(TIMED_DECL)) {
    if (isCovered(decl.index)) continue;
    for (const time of decl[3].matchAll(NON_ZERO_TIME)) {
      if (isZero(time[1])) continue;
      errors.push(
        `${file}:${lineOf(css, decl.index)}: literal duration \`${time[0]}\` in ` +
          `\`${decl[1]}${decl[2] ?? ''}\` — use a var(--motion-*) token so ` +
          `reduced motion reaches it (see ${TOKENS_FILE}).`
      );
    }
  }

  for (const decl of css.matchAll(/scroll-behavior\s*:\s*smooth/g)) {
    if (isCovered(decl.index)) continue;
    errors.push(
      `${file}:${lineOf(css, decl.index)}: \`scroll-behavior: smooth\` has no ` +
        `duration to tokenise and ignores reduced motion — scroll from JS via ` +
        `smoothScrollOptions() in src/ui/utils/createMediaQuery.ts instead.`
    );
  }
}

if (errors.length) {
  console.error(
    `reduced motion (CLAUDE.md #9): ${errors.length} problem(s).\n` +
      errors.map(e => `  ${e}`).join('\n')
  );
  process.exit(1);
}
console.log(
  `reduced motion OK — ${decorative.length} decorative token(s) zeroed under ` +
    `${REDUCE_QUERY}; ${cssFiles.length} CSS file(s) free of literal durations.`
);
