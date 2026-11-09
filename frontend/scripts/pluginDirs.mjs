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

export const inRepoPluginDirs = () => {
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

// Out-of-tree plugin checkouts (the civ-plugins dev loop), comma- or
// colon-separated, relative to the repo root as in the dev loop.
export const envPluginDirs = () =>
  (process.env.OMS_PLUGIN_DIRS ?? '')
    .split(/[,:]/)
    .filter(Boolean)
    .map(dir => resolve('..', dir));
