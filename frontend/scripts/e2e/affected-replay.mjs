#!/usr/bin/env node
/*
 * Replay merged PRs through `e2e:affected`, to see what it would have
 * selected. For tuning the config and the derivation against real changes
 * rather than guesses — the selection is computed on THIS tree, so a PR whose
 * files were since moved reads as "unmapped".
 *
 *   node scripts/e2e/affected-replay.mjs 1054 1052 905     # these PRs
 *   node scripts/e2e/affected-replay.mjs --server --limit 60
 *                                        # recent merged PRs touching server/
 *
 * Needs `gh` authenticated against the repo.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'affected.mjs'
);
const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i === -1 ? dflt : args[i + 1];
};
const gh = a => JSON.parse(execFileSync('gh', a, { encoding: 'utf8' }));

let prs;
const numbers = args.filter(
  (a, i) => /^\d+$/.test(a) && args[i - 1] !== '--limit'
);
if (numbers.length) {
  prs = numbers.map(n =>
    gh(['pr', 'view', n, '--json', 'number,title,baseRefName,files'])
  );
} else {
  prs = gh([
    'pr',
    'list',
    '--state',
    'merged',
    '--limit',
    flag('--limit', '60'),
    '--json',
    'number,title,baseRefName,files',
  ]);
  if (args.includes('--server'))
    prs = prs.filter(p => p.files.some(f => /^server\/.*\.rs$/.test(f.path)));
}

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(
  pad('PR', 6),
  pad('base', 14),
  pad('tier', 9),
  pad('all', 4),
  pad('near', 5),
  pad('near suites', 70),
  'title'
);
for (const pr of prs) {
  const files = pr.files.map(f => f.path);
  const sel = JSON.parse(
    execFileSync('node', [SCRIPT, '--json', '--files', ...files], {
      encoding: 'utf8',
      cwd: path.dirname(SCRIPT),
      maxBuffer: 64 * 1024 * 1024,
    })
  );
  const near = sel.near.map(s => s.replace(/-regression$/, '')).join(',');
  console.log(
    pad(pr.number, 6),
    pad(pr.baseRefName, 14),
    pad(sel.tier, 9),
    pad(sel.suites.length, 4),
    pad(sel.near.length, 5),
    pad(near, 70),
    pr.title.slice(0, 50)
  );
  if (sel.unmapped.length)
    console.log('       unmapped:', sel.unmapped.join(' '));
}
