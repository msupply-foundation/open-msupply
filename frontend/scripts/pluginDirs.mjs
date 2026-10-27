/*
 * The plugin directories the build scripts discover — shared by
 * build-plugins.mjs (build + pack) and emit-form-schemas.mjs (the form
 * schemas), so the two walk the same set.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/*
 * The in-repo plugin directories. `plugins/*` holds the real country plugins;
 * `plugins/examples/*` holds the reference plugins that prove the mechanism.
 * `plugins/examples` itself is a grouping directory, not a plugin, so it is
 * walked one level deeper rather than read as an entry in its own right. The
 * dev loop (vite/devPlugins.ts) does NOT walk these: building everything is
 * packaging, serving everything at once is a broken dev session.
 */
const PLUGINS_ROOT = 'plugins';
const EXAMPLES_DIR = 'examples';

export const inRepoPluginDirs = () => {
  const dirs = [];
  const walk = root => {
    if (!existsSync(root)) return;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(root, entry.name);
      if (root === PLUGINS_ROOT && entry.name === EXAMPLES_DIR) walk(dir);
      else dirs.push(dir);
    }
  };
  walk(PLUGINS_ROOT);
  return dirs;
};

// Out-of-tree plugin checkouts (the civ-plugins dev loop), comma- or
// colon-separated.
export const envPluginDirs = () =>
  (process.env.OMS_PLUGIN_DIRS ?? '').split(/[,:]/).filter(Boolean);
