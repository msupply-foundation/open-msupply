#!/usr/bin/env node
// The canonical bundle measurement (kdd/bundling § Measurement,
// kdd/bundle-size-by-pr.md): per-page gzip sums off the build manifest
// (build.manifest, vite.config.ts). dist/ carries two pages since the
// second-entry change — the tracked "served app" number is everything
// reachable from index.html plus the shared-module facade entries; chunks
// only the discovery page reaches are the shells' cost, never served to a
// browser by a server, so they are reported on their own line and excluded
// from the tracked series. "Up front" is the part of the served app the page
// loads before the first screen: index.html's static imports, which it
// preloads. The rest, the plugin facades included, is fetched lazily.
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
const APP_PAGE = 'index.html';

// assets/Badge-BiJqBSfC.js → assets/Badge.js: the name a chunk keeps from
// build to build, so two builds can be compared chunk by chunk.
export const chunkName = file =>
  file.replace(/-[A-Za-z0-9_-]{8}(?=\.\w+$)/, '');

// The name a JS chunk is compared by. Where the manifest key is a source path
// it is used as is: unique, and stable across builds (assets/common.js alone
// would be every locale's common.json). A package path drops the pnpm store
// prefix, so a version bump doesn't rename it. Shared chunks (keys starting
// "_") have no source path, so they fall back to the file name without its
// hash, which several of them can share.
export const stableName = (key, file) => {
  if (key.startsWith('_')) return chunkName(file);
  const pkg = key.match(/node_modules\/\.pnpm\/[^/]+\/node_modules\/(.+)$/);
  return pkg ? pkg[1] : key;
};

export const measure = dist => {
  const manifest = JSON.parse(
    readFileSync(join(dist, '.vite/manifest.json'), 'utf8')
  );

  // Every manifest key reachable from the given roots, static and dynamic
  // imports alike (a dynamic import is still shipped weight). With
  // staticOnly, just what loads before the first screen: the chunks the page
  // preloads, not the ones a screen fetches when it opens.
  const reach = (roots, { staticOnly = false } = {}) => {
    const seen = new Set();
    const walk = key => {
      if (seen.has(key) || !manifest[key]) return;
      seen.add(key);
      for (const k of manifest[key].imports ?? []) walk(k);
      if (!staticOnly)
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
  const nameOf = new Map(
    Object.entries(manifest).map(([k, v]) => [v.file, stableName(k, v.file)])
  );
  // Total gzip bytes, and per chunk name (chunks that share a name are
  // summed, and countByName says how many were).
  const sizes = files => {
    const byName = {};
    const countByName = {};
    let total = 0;
    for (const f of files) {
      const n = gzipSync(readFileSync(join(dist, f))).length;
      const name = f.endsWith('.js')
        ? (nameOf.get(f) ?? chunkName(f))
        : chunkName(f);
      total += n;
      byName[name] = (byName[name] ?? 0) + n;
      countByName[name] = (countByName[name] ?? 0) + 1;
    }
    return { total, count: files.size, byName, countByName };
  };

  const entries = Object.keys(manifest).filter(k => manifest[k].isEntry);
  const appEntries = entries.filter(k => k !== DISCOVERY_PAGE);
  const app = reach(appEntries);
  // The page alone, not the shared-module facades: those load only when an
  // installed plugin imports them, after sign-in.
  const upfront = reach([APP_PAGE], { staticOnly: true });
  const all = reach(entries);
  const appJs = jsFiles(app);
  const appCss = cssFiles(app);
  const discoveryOnlyJs = new Set([...jsFiles(all)].filter(f => !appJs.has(f)));
  const discoveryOnlyCss = new Set(
    [...cssFiles(all)].filter(f => !appCss.has(f))
  );

  return {
    app: { js: sizes(appJs), css: sizes(appCss) },
    upfront: { js: sizes(jsFiles(upfront)), css: sizes(cssFiles(upfront)) },
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
    const { app, upfront, discoveryOnly } = m;
    console.log(
      `served app JS gzip:      ${kb(app.js.total)} (${app.js.count} chunks)  <- the tracked number`
    );
    console.log(
      `served app CSS gzip:     ${kb(app.css.total)} (${app.css.count} files)`
    );
    console.log(
      `  of which up front JS:  ${kb(upfront.js.total)} (${upfront.js.count} chunks)`
    );
    console.log(
      `  of which up front CSS: ${kb(upfront.css.total)} (${upfront.css.count} files)`
    );
    console.log(
      `discovery-only JS gzip:  ${kb(discoveryOnly.js.total)} (${discoveryOnly.js.count} chunks)`
    );
    console.log(
      `discovery-only CSS gzip: ${kb(discoveryOnly.css.total)} (${discoveryOnly.css.count} files)`
    );
  }
}
