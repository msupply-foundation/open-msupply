/*
 * The plugin directories the build scripts discover — shared by
 * build-plugins.mjs (build + pack) and emit-form-schemas.mjs (the form
 * schemas), so the two walk the same set.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/*
 * The in-repo plugin directories, both outside frontend/: `private/plugins/*`
 * holds the real country plugins (never published to the public mirror), and
 * `plugins/*` the public ones — today only `plugins/examples/*`, the reference
 * plugins that prove the mechanism. `plugins/examples` itself is a grouping
 * directory, not a plugin, so it is walked one level deeper rather than read
 * as an entry in its own right. A root missing altogether is skipped: the
 * public mirror has no `private/`. The dev loop (vite/devPlugins.ts) does NOT
 * walk these: building everything is packaging, serving everything at once is
 * a broken dev session.
 */
const PLUGIN_ROOTS = ['../plugins', '../private/plugins'];
const EXAMPLES_DIR = '../plugins/examples';

/*
 * A plugin directory holding one of these files is left out of discovery: never
 * built, packed or published, though its source stays. The file says why.
 *   - `ARCHIVED.md`: retired, kept for its history and the sites still on its
 *     last release. Nothing in it is kept building against today's client/ or
 *     server. Archiving is how a plugin leaves the Launchpad without deletion.
 *   - `INCOMPATIBLE.md`: doesn't work on today's server, and isn't fixed yet.
 *     The server only gates a plugin that is too new for it, never one too old,
 *     so this keeps a release for today's servers from being published at all.
 *     The file names the follow-up; delete it with the fix.
 */
export const SKIP_MARKERS = {
  'ARCHIVED.md': 'archived',
  'INCOMPATIBLE.md': 'not compatible with this server',
};

const skipMarker = dir =>
  Object.keys(SKIP_MARKERS).find(marker => existsSync(join(dir, marker)));

const allInRepoPluginDirs = () => {
  const dirs = [];
  const walk = root => {
    if (!existsSync(root)) return;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(root, entry.name);
      if (dir === EXAMPLES_DIR) walk(dir);
      else dirs.push(dir);
    }
  };
  PLUGIN_ROOTS.forEach(walk);
  return dirs;
};

export const inRepoPluginDirs = () =>
  allInRepoPluginDirs().filter(dir => !skipMarker(dir));

/**
 * The plugin directories left out by a marker, each with the marker and why,
 * which the build names as it skips them.
 */
export const skippedPluginDirs = () =>
  allInRepoPluginDirs()
    .map(dir => ({ dir, marker: skipMarker(dir) }))
    .filter(({ marker }) => marker)
    .map(({ dir, marker }) => ({ dir, marker, why: SKIP_MARKERS[marker] }));

// Out-of-tree plugin checkouts (the civ-plugins dev loop), comma- or
// colon-separated, relative to the repo root as in the dev loop.
export const envPluginDirs = () =>
  (process.env.OMS_PLUGIN_DIRS ?? '')
    .split(/[,:]/)
    .filter(Boolean)
    .map(dir => resolve('..', dir));
