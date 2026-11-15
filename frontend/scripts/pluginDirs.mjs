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
 * A plugin directory holding `ARCHIVED.md` is retired: kept for its history
 * and for the sites still running its last release, never built, packed or
 * installed again. The file says why and what replaced it. Archiving is how a
 * plugin leaves the Launchpad without being deleted; nothing in it is kept
 * building against today's client/ or server.
 */
export const ARCHIVE_MARKER = 'ARCHIVED.md';

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

const isArchived = dir => existsSync(join(dir, ARCHIVE_MARKER));

export const inRepoPluginDirs = () =>
  allInRepoPluginDirs().filter(dir => !isArchived(dir));

/** The archived plugin directories, which the build names and skips. */
export const archivedPluginDirs = () =>
  allInRepoPluginDirs().filter(isArchived);

// Out-of-tree plugin checkouts (the civ-plugins dev loop), comma- or
// colon-separated, relative to the repo root as in the dev loop.
export const envPluginDirs = () =>
  (process.env.OMS_PLUGIN_DIRS ?? '')
    .split(/[,:]/)
    .filter(Boolean)
    .map(dir => resolve('..', dir));
