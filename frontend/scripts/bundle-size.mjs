#!/usr/bin/env node
// The canonical bundle measurement (kdd/bundling § Measurement,
// kdd/bundle-size-by-pr.md): per-page gzip sums off the build manifest
// (build.manifest, vite.config.ts). dist/ carries two pages since the
// second-entry change — the tracked "served app" number is everything
// reachable from index.html plus the shared-module facade entries; chunks
// only the discovery page reaches are the shells' cost, never served to a
// browser by a server, so they are reported on their own line and excluded
// from the tracked series.
//
//   pnpm build && node scripts/bundle-size.mjs [dist]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DISCOVERY_PAGE = 'discovery.html';

const dist = process.argv[2] ?? 'dist';
const manifest = JSON.parse(
  readFileSync(join(dist, '.vite/manifest.json'), 'utf8')
);

// Every manifest key reachable from the given roots, static and dynamic
// imports alike (a dynamic import is still shipped weight).
const reach = roots => {
  const seen = new Set();
  const walk = key => {
    if (seen.has(key) || !manifest[key]) return;
    seen.add(key);
    for (const k of manifest[key].imports ?? []) walk(k);
    for (const k of manifest[key].dynamicImports ?? []) walk(k);
  };
  roots.forEach(walk);
  return seen;
};

const jsFiles = keys =>
  new Set([...keys].map(k => manifest[k].file).filter(f => f.endsWith('.js')));
const cssFiles = keys => new Set([...keys].flatMap(k => manifest[k].css ?? []));
const gz = files =>
  [...files].reduce(
    (total, f) => total + gzipSync(readFileSync(join(dist, f))).length,
    0
  );
const kb = n => `${(n / 1024).toFixed(1)} KB`;

const entries = Object.keys(manifest).filter(k => manifest[k].isEntry);
const app = reach(entries.filter(k => k !== DISCOVERY_PAGE));
const all = reach(entries);
const appJs = jsFiles(app);
const discoveryOnlyJs = [...jsFiles(all)].filter(f => !appJs.has(f));
const appCss = cssFiles(app);
const discoveryOnlyCss = [...cssFiles(all)].filter(f => !appCss.has(f));

console.log(
  `served app JS gzip:      ${kb(gz(appJs))} (${appJs.size} chunks)  <- the tracked number`
);
console.log(
  `served app CSS gzip:     ${kb(gz(appCss))} (${appCss.size} files)`
);
console.log(
  `discovery-only JS gzip:  ${kb(gz(new Set(discoveryOnlyJs)))} (${discoveryOnlyJs.length} chunks)`
);
console.log(
  `discovery-only CSS gzip: ${kb(gz(new Set(discoveryOnlyCss)))} (${discoveryOnlyCss.length} files)`
);
