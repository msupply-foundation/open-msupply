#!/usr/bin/env node
// Compares two `bundle-size.mjs --json` measurements — a PR's build and its
// base's — into the markdown frontend-check-test.yaml posts on the PR.
//
//   node scripts/bundle-size-report.mjs base.json pr.json [--base <sha>]
//
// Prints { significant, markdown }. `significant` is whether the total JS or
// CSS, or the JS loaded up front, moved enough to be worth a comment: a PR
// that doesn't change the bundle gets no comment (the job summary still has
// the table).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Below this, a change is noise: gzip output shifts by a few bytes when an
// imported chunk's hash changes, even with no code change.
export const SIGNIFICANT_BYTES = 512;
// A chunk is listed when it moved at least this much, or appeared/went.
export const CHUNK_BYTES = 512;
const MAX_CHUNK_ROWS = 25;

export const MARKER = '<!-- solid-bundle-size -->';

const kb = n => `${(n / 1024).toFixed(1)} KB`;
const signedKb = n =>
  `${n > 0 ? '+' : n < 0 ? '−' : '±'}${(Math.abs(n) / 1024).toFixed(1)} KB`;
const pct = (delta, base) =>
  base && delta
    ? ` (${delta > 0 ? '+' : '−'}${Math.abs((100 * delta) / base).toFixed(1)}%)`
    : '';

const chunkRows = (base, pr) => {
  const names = new Set([...Object.keys(base), ...Object.keys(pr)]);
  return [...names]
    .map(name => ({ name, base: base[name], pr: pr[name] }))
    .map(r => ({ ...r, delta: (r.pr ?? 0) - (r.base ?? 0) }))
    .filter(
      r =>
        r.base === undefined ||
        r.pr === undefined ||
        Math.abs(r.delta) >= CHUNK_BYTES
    )
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
};

export const compareSizes = (base, pr, { baseSha } = {}) => {
  const moved = part => Math.abs(part(pr).total - part(base).total);
  // Up front on its own too: code moving from a lazy chunk into the first
  // screen's load leaves the total alone but is exactly what to catch.
  const significant = [m => m.app.js, m => m.app.css, m => m.upfront.js].some(
    part => moved(part) >= SIGNIFICANT_BYTES
  );

  const row = (label, b, p, unit) =>
    `| ${label} | ${kb(b.total)} (${b.count} ${unit}) | ${kb(p.total)} (${p.count} ${unit}) | ${signedKb(p.total - b.total)}${pct(p.total - b.total, b.total)} |`;

  const upfrontNames = new Set(
    [base, pr].flatMap(m => [
      ...Object.keys(m.upfront.js.byName),
      ...Object.keys(m.upfront.css.byName),
    ])
  );
  const chunks = [
    ...chunkRows(base.app.js.byName, pr.app.js.byName),
    ...chunkRows(base.app.css.byName, pr.app.css.byName),
  ].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const lines = [
    MARKER,
    `**Bundle size** — Solid front end, served app, gzip${baseSha ? `, against \`${baseSha.slice(0, 10)}\`` : ''}`,
    '',
    '| | Base | This PR | Change |',
    '|---|---|---|---|',
    row('JS up front', base.upfront.js, pr.upfront.js, 'chunks'),
    row('JS total (tracked)', base.app.js, pr.app.js, 'chunks'),
    row('CSS up front', base.upfront.css, pr.upfront.css, 'files'),
    row('CSS total', base.app.css, pr.app.css, 'files'),
    '',
    '_Up front_ is what loads before the first screen; the rest of the total loads when a screen that needs it opens.',
  ];
  if (chunks.length) {
    const shown = chunks.slice(0, MAX_CHUNK_ROWS);
    lines.push(
      '',
      `<details><summary>Chunks that changed by ${kb(CHUNK_BYTES)} or more, appeared or went (${chunks.length})</summary>`,
      '',
      '| Chunk | Loads | Base | This PR | Change |',
      '|---|---|---|---|---|',
      ...shown.map(
        r =>
          `| \`${r.name}\` | ${upfrontNames.has(r.name) ? 'up front' : 'lazily'} | ${r.base === undefined ? 'new' : kb(r.base)} | ${r.pr === undefined ? 'removed' : kb(r.pr)} | ${signedKb(r.delta)} |`
      ),
      ...(chunks.length > shown.length
        ? ['', `…and ${chunks.length - shown.length} more.`]
        : []),
      '',
      '</details>'
    );
  }
  if (significant)
    lines.push(
      '',
      'This changes the tracked number: add a row to `frontend/kdd/bundle-size-by-pr.md` when it merges.'
    );
  return { significant, markdown: lines.join('\n') };
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--base');
  const baseSha = i >= 0 ? args[i + 1] : undefined;
  const [basePath, prPath] = args.filter(
    (a, j) => !a.startsWith('--') && (i < 0 || j !== i + 1)
  );
  if (!basePath || !prPath) {
    console.error(
      'usage: bundle-size-report.mjs base.json pr.json [--base <sha>]'
    );
    process.exit(2);
  }
  const read = p => JSON.parse(readFileSync(p, 'utf8'));
  console.log(
    JSON.stringify(compareSizes(read(basePath), read(prPath), { baseSha }))
  );
}
