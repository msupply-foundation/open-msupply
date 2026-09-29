#!/usr/bin/env node
// Copy discovery.html + its transitive chunks/css/assets out of a full
// `pnpm build` dist/ into a self-contained directory for the desktop shell
// (scripts/package-desktop.sh). Manifest-driven (build.manifest,
// vite.config.ts) so the set is exact: the app's own chunks, index.html and
// the shared-module facades stay behind — the installer carries the page,
// not the product.
//
//   node scripts/prune-discovery-dist.mjs [dist] [out]
import { cpSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [dist = 'dist', out = 'desktop/dist-discovery'] = process.argv.slice(2);
const PAGE = 'discovery.html';

const manifest = JSON.parse(
  readFileSync(join(dist, '.vite/manifest.json'), 'utf8')
);
if (!manifest[PAGE])
  throw new Error(`${PAGE} missing from ${dist}/.vite/manifest.json`);

// favicon.svg is public/ passthrough, referenced by the page's <head> but
// not in the manifest.
const files = new Set([PAGE, 'favicon.svg']);
const seen = new Set();
const walk = key => {
  if (seen.has(key)) return;
  seen.add(key);
  const entry = manifest[key];
  if (!entry) return;
  files.add(entry.file);
  for (const f of entry.css ?? []) files.add(f);
  for (const f of entry.assets ?? []) files.add(f);
  for (const k of entry.imports ?? []) walk(k);
  // Dynamic imports are still shipped weight: DiscoveryPage, intl and every
  // locale dictionary (language can be chosen before any server exists).
  for (const k of entry.dynamicImports ?? []) walk(k);
};
walk(PAGE);

// url(...) references inside the collected stylesheets (fonts, images) —
// belt-and-braces over the manifest's per-chunk asset lists.
for (const f of [...files].filter(f => f.endsWith('.css'))) {
  const css = readFileSync(join(dist, f), 'utf8');
  for (const m of css.matchAll(/url\(['"]?\/?([^)'"?#]+)/g))
    if (m[1].startsWith('assets/')) files.add(m[1]);
}

rmSync(out, { recursive: true, force: true });
let copied = 0;
for (const f of files) {
  const source = join(dist, f);
  if (!existsSync(source)) continue; // e.g. no favicon in an odd build
  mkdirSync(join(out, dirname(f)), { recursive: true });
  cpSync(source, join(out, f));
  copied += 1;
}
console.log(`${out}: ${copied} files pruned from ${dist}`);
