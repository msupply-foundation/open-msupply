/*
 * Proves that co-locating country plugin sources in this repo costs the APP
 * bundle nothing — the load-bearing claim behind the `plugins/` directory
 * (CLAUDE.md § priorities: bundle size is tracked, not aspirational).
 *
 * The dev link is a `DEV_PLUGINS`-gated `import.meta.glob`
 * (src/plugins/loader.ts). In a production build `DEV_PLUGINS` is defined as
 * '', so the branch is statically false and Rollup should drop the glob and
 * everything it would have imported. "Should" is the reason this script
 * exists: a dynamic import behind a false constant is proven to eliminate in
 * this repo (the dev-only showcase, kdd/showcase-harness), but the glob
 * variant is not, and a silent regression here would ship every country's
 * plugin to every device.
 *
 *   pnpm build && pnpm check:plugin-exclusion
 *
 * Run after a PRODUCTION build. Fails if any plugin's code, a plugin source
 * path, or a plugin-identifying string appears in dist/.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const distAssets = join(root, 'dist', 'assets');
const pluginsDir = join(root, 'plugins');

if (!existsSync(distAssets)) {
  console.error('No dist/assets — run `pnpm build` first.');
  process.exit(1);
}
if (!existsSync(pluginsDir)) {
  console.info(
    'check-plugin-bundle: no plugins/ directory — nothing to check.'
  );
  process.exit(0);
}

const pluginDirs = readdirSync(pluginsDir).filter(name =>
  statSync(join(pluginsDir, name)).isDirectory()
);

// Every marker that would betray a plugin having been bundled: its code (the
// manifest name, which appears in its plugin.tsx manifest literal) and its
// source path (which appears in glob-generated module maps).
const markers = [];
for (const directory of pluginDirs) {
  const manifestPath = join(pluginsDir, directory, 'package.json');
  if (!existsSync(manifestPath)) continue;
  const { name } = JSON.parse(readFileSync(manifestPath, 'utf8'));
  // A manifest with no `name` has no plugin code to look for; the source-path
  // marker below still covers it. Guarded because `includes(undefined)` matches
  // any chunk containing the literal text "undefined" — a false positive that
  // would fail every build.
  if (typeof name === 'string' && name.length > 0)
    markers.push({ directory, marker: name, what: 'plugin code' });
  markers.push({
    directory,
    marker: `/plugins/${directory}/src/`,
    what: 'plugin source path',
  });
}

const files = readdirSync(distAssets).filter(
  name => name.endsWith('.js') || name.endsWith('.css')
);

const hits = [];
for (const file of files) {
  const content = readFileSync(join(distAssets, file), 'utf8');
  for (const { directory, marker, what } of markers)
    if (content.includes(marker))
      hits.push(
        `dist/assets/${file} contains ${what} "${marker}" (plugins/${directory})`
      );
  // A chunk NAMED after a plugin means the glob produced real chunks.
  for (const { directory } of markers)
    if (file.includes(directory) && file.startsWith('plugin'))
      hits.push(
        `dist/assets/${file} looks like a plugin chunk (plugins/${directory})`
      );
}

if (hits.length > 0) {
  console.error(
    'Plugin sources leaked into the production app bundle:\n' +
      hits.map(hit => `  - ${hit}`).join('\n') +
      '\n\nThe dev link must stay behind the DEV_PLUGINS constant (vite.config.ts' +
      ' defines it as "" for production builds) so Rollup can eliminate it.'
  );
  process.exit(1);
}

console.info(
  `check-plugin-bundle: ${pluginDirs.length} plugin source tree(s) excluded from ${files.length} built asset(s).`
);
