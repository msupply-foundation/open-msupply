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
//   pnpm build && node scripts/bundle-size.mjs [dist] [--json]
//
// --json prints the measurement with per-chunk sizes, for
// scripts/bundle-size-report.mjs (the PR comment in frontend-check-test.yaml).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const DISCOVERY_PAGE = 'discovery.html';

// assets/Badge-BiJqBSfC.js → assets/Badge.js: the name a chunk keeps from
// build to build, so two builds can be compared chunk by chunk.
export const chunkName = file =>
  file.replace(/-[A-Za-z0-9_-]{8}(?=\.\w+$)/, '');

export const measure = dist => {
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
    new Set(
      [...keys].map(k => manifest[k].file).filter(f => f.endsWith('.js'))
    );
  const cssFiles = keys =>
    new Set([...keys].flatMap(k => manifest[k].css ?? []));
  // Total gzip bytes, and per chunk name (chunks that share a name once the
  // hash is gone are summed).
  const sizes = files => {
    const byName = {};
    let total = 0;
    for (const f of files) {
      const n = gzipSync(readFileSync(join(dist, f))).length;
      total += n;
      byName[chunkName(f)] = (byName[chunkName(f)] ?? 0) + n;
    }
    return { total, count: files.size, byName };
  };

  const entries = Object.keys(manifest).filter(k => manifest[k].isEntry);
  const app = reach(entries.filter(k => k !== DISCOVERY_PAGE));
  const all = reach(entries);
  const appJs = jsFiles(app);
  const appCss = cssFiles(app);
  const discoveryOnlyJs = new Set([...jsFiles(all)].filter(f => !appJs.has(f)));
  const discoveryOnlyCss = new Set(
    [...cssFiles(all)].filter(f => !appCss.has(f))
  );

  return {
    app: { js: sizes(appJs), css: sizes(appCss) },
    discoveryOnly: { js: sizes(discoveryOnlyJs), css: sizes(discoveryOnlyCss) },
  };
};

const kb = n => `${(n / 1024).toFixed(1)} KB`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const dist = args.find(a => !a.startsWith('--')) ?? 'dist';
  const m = measure(dist);
  if (json) {
    console.log(JSON.stringify(m));
  } else {
    const { app, discoveryOnly } = m;
    console.log(
      `served app JS gzip:      ${kb(app.js.total)} (${app.js.count} chunks)  <- the tracked number`
    );
    console.log(
      `served app CSS gzip:     ${kb(app.css.total)} (${app.css.count} files)`
    );
    console.log(
      `discovery-only JS gzip:  ${kb(discoveryOnly.js.total)} (${discoveryOnly.js.count} chunks)`
    );
    console.log(
      `discovery-only CSS gzip: ${kb(discoveryOnly.css.total)} (${discoveryOnly.css.count} files)`
    );
  }
}
