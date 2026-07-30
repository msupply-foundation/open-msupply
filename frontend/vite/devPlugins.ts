import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchForWorkspaceRoot, type Plugin } from 'vite';

/*
 * The author dev loop, source mode (kdd/plugin-loading § dev override).
 *
 * A plugin under development is imported FROM SOURCE into the host's own Vite
 * module graph, rather than as a built bundle fetched from the server: one
 * Solid runtime, the live in-tree SDK (through the `@openmsupply/plugin-sdk`
 * alias), and HMR on the plugin's own files. No import map, no CORS, no
 * rebuild between edits.
 *
 * The graph entry point is the virtual module `virtual:oms-dev-plugins`, whose
 * generated source is a code → lazy-import map:
 *
 *   export const devPlugins = {
 *     "hello_world": () => import("/abs/path/examples/hello_world/plugin.tsx"),
 *   };
 *
 * Dynamic imports (not static), so a plugin that fails to evaluate is that
 * plugin's failure — the loader still registers its siblings (AC-PLUG-L3).
 *
 * Dev plugins are OPT-IN: only the directories named by OMS_PLUGIN_DIRS load
 * (absolute, or relative to the repo root — `OMS_PLUGIN_DIRS=plugins/civ` for
 * an in-repo plugin, `../civ-plugins/frontend/latest` for a checkout).
 * Deliberately nothing by default: the in-repo country plugins target
 * overlapping slots, so an all-of-`plugins/*` dev session would render every
 * deployment's contributions at once. Each named directory is identified by a
 * package.json declaring `omSupplyPlugin.target === 'frontend'`, with the
 * entry module the first of ENTRY_CANDIDATES that exists — the same rule
 * `scripts/build-plugins.mjs` uses (that one DOES walk `examples/*` and
 * `plugins/*`: building everything is packaging, not a dev session).
 *
 * The discovery/codegen half is pure and injected-fs, so it is unit-testable
 * (devPlugins.test.ts); only `devPluginsPlugin` touches the disk.
 */

/** The specifier the app imports (src/plugins/devPluginSources.ts). */
export const DEV_PLUGINS_MODULE_ID = 'virtual:oms-dev-plugins';
// Leading NUL marks it resolved and off-limits to other plugins (Rollup
// convention).
const RESOLVED_ID = `\0${DEV_PLUGINS_MODULE_ID}`;

/**
 * Where a plugin's entry module may live, in preference order — the same list
 * `scripts/build-plugins.mjs` uses. `plugin.tsx` at the root is the examples'
 * shape; `src/plugin.tsx` is the out-of-tree one (civ-plugins).
 */
export const ENTRY_CANDIDATES: readonly string[] = [
  'plugin.tsx',
  'plugin.ts',
  'src/plugin.tsx',
  'src/plugin.ts',
];

/** The disk reads discovery needs — faked in tests. */
export interface DevPluginFs {
  /** Parsed JSON, or undefined when the file does not exist / is unreadable. */
  readJson: (file: string) => unknown;
  exists: (file: string) => boolean;
}

/** One plugin the dev server will serve from source. */
export interface DevPluginEntry {
  /** The plugin code (its package name) — the host's registration identity. */
  code: string;
  /** Absolute path of the plugin directory. */
  dir: string;
  /** Absolute path of the entry module. */
  entry: string;
}

export interface DevPluginDiscovery {
  plugins: readonly DevPluginEntry[];
  /** Author-facing complaints about explicitly requested directories. */
  problems: readonly string[];
}

/**
 * Split an OMS_PLUGIN_DIRS value into absolute directories. Colon- or
 * comma-separated (as `scripts/build-plugins.mjs` accepts), each entry either
 * absolute or relative to the repo root.
 */
export const parsePluginDirs = (
  value: string | undefined,
  root: string
): readonly string[] => {
  const seen = new Set<string>();
  for (const raw of (value ?? '').split(/[,:]/)) {
    const trimmed = raw.trim();
    if (trimmed) seen.add(resolve(root, trimmed));
  }
  return [...seen];
};

/**
 * Whether `dir` sits outside the repo — i.e. whether the dev server has to be
 * told to serve files from it (`server.fs.allow`).
 */
export const isOutsideRoot = (root: string, dir: string): boolean => {
  const inside = relative(root, dir);
  return inside === '' ? false : inside.startsWith('..') || isAbsolute(inside);
};

/**
 * What the dev server must be allowed to SERVE for an out-of-tree plugin: its
 * own project root — the nearest ancestor holding a `.git` — not just the
 * plugin directory.
 *
 * A plugin's module graph is not confined to its package: civ-plugins keeps the
 * wire contract its two halves share in a sibling `shared/` (imported by
 * relative path from both, and mounted separately by its own test harness), so
 * allowing only `frontend/latest` makes the plugin's first real import 403 with
 * "outside of Vite serving allow list". Falls back to the directory itself when
 * there is no repo above it.
 */
export const pluginProjectRoot = (dir: string, fs: DevPluginFs): string => {
  for (let current = dir; ;) {
    // A file in a worktree/submodule, a directory otherwise — `exists` covers
    // both.
    if (fs.exists(join(current, '.git'))) return current;
    const parent = dirname(current);
    if (parent === current) return dir;
    current = parent;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readPlugin = (
  dir: string,
  fs: DevPluginFs
): DevPluginEntry | { problem: string } => {
  const manifest = fs.readJson(join(dir, 'package.json'));
  if (!isRecord(manifest)) {
    return { problem: `${dir}: no readable package.json` };
  }
  const declaration = manifest['omSupplyPlugin'];
  if (!isRecord(declaration) || declaration['target'] !== 'frontend') {
    return {
      problem: `${dir}: package.json has no omSupplyPlugin.target "frontend"`,
    };
  }
  const code = manifest['name'];
  if (typeof code !== 'string' || code.length === 0) {
    return { problem: `${dir}: package.json has no name (the plugin code)` };
  }
  const entry = ENTRY_CANDIDATES.find(candidate =>
    fs.exists(join(dir, candidate))
  );
  if (!entry) {
    return {
      problem: `${dir}: no plugin entry (looked for ${ENTRY_CANDIDATES.join(', ')})`,
    };
  }
  return { code, dir, entry: join(dir, entry) };
};

/**
 * Enumerate the plugins to serve from source: exactly the directories named by
 * OMS_PLUGIN_DIRS, nothing by default (see the module comment — the in-repo
 * plugins are opted into the same way, by relative path).
 *
 * Every named directory that cannot be used is reported, because silently
 * loading nothing is the failure mode that wastes an afternoon. Later entries
 * win on a code collision.
 */
export const discoverDevPlugins = (
  root: string,
  pluginDirs: string | undefined,
  fs: DevPluginFs
): DevPluginDiscovery => {
  const problems: string[] = [];
  const found = new Map<string, DevPluginEntry>();

  for (const dir of parsePluginDirs(pluginDirs, root)) {
    const result = readPlugin(dir, fs);
    if ('problem' in result) problems.push(result.problem);
    else found.set(result.code, result);
  }

  return { plugins: [...found.values()], problems };
};

/** The generated source of `virtual:oms-dev-plugins`. */
export const renderDevPluginsModule = (
  plugins: readonly DevPluginEntry[]
): string =>
  [
    `// Generated by vite/devPlugins.ts — dev only, never in a build.`,
    `export const devPlugins = {`,
    ...plugins.map(
      // Absolute paths: Vite resolves them itself (rewriting out-of-root ones
      // to /@fs/…, which is why those directories join server.fs.allow below).
      p =>
        `  ${JSON.stringify(p.code)}: () => import(${JSON.stringify(p.entry)}),`
    ),
    `};`,
    '',
  ].join('\n');

const nodeFs: DevPluginFs = {
  readJson: file => {
    if (!existsSync(file)) return undefined;
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      return undefined;
    }
  },
  exists: existsSync,
};

/**
 * The dev-only source-mode plugin. Serves `virtual:oms-dev-plugins` and opens
 * `server.fs.allow` for out-of-tree plugin directories.
 *
 * NOT `apply: 'serve'`: Rollup resolves a dynamic import while building the
 * module graph, BEFORE the `import.meta.env.DEV` branch that contains it is
 * treeshaken away, so the specifier must still resolve in a production build.
 * It resolves there to an empty map — dead code with no importer, so no chunk
 * is emitted (verified by the dist grep in the PR gates).
 */
export const devPluginsPlugin = (): Plugin => {
  // This file lives in <repo>/vite/, and it is only ever used by this repo's
  // own vite.config.ts.
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  let serving = false;

  return {
    name: 'oms:dev-plugins',

    config(_config, env) {
      serving = env.command === 'serve';
      if (!serving) return undefined;
      const outOfTree = parsePluginDirs(
        process.env.OMS_PLUGIN_DIRS,
        root
      ).filter(dir => isOutsideRoot(root, dir));
      if (outOfTree.length === 0) return undefined;
      return {
        // Providing `allow` replaces Vite's default, so the workspace root has
        // to be restated — searchForWorkspaceRoot is the same call Vite makes.
        // Each plugin joins as its own PROJECT root, so its imports of sibling
        // modules in the same checkout resolve (see pluginProjectRoot).
        server: {
          fs: {
            allow: [
              searchForWorkspaceRoot(root),
              ...outOfTree.map(dir => pluginProjectRoot(dir, nodeFs)),
            ],
          },
        },
      };
    },

    resolveId(id) {
      return id === DEV_PLUGINS_MODULE_ID ? RESOLVED_ID : undefined;
    },

    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      if (!serving) return renderDevPluginsModule([]);
      const { plugins, problems } = discoverDevPlugins(
        root,
        process.env.OMS_PLUGIN_DIRS,
        nodeFs
      );
      for (const problem of problems) {
        this.warn(`[dev-plugins] ${problem}`);
      }
      if (plugins.length > 0) {
        this.info(
          `[dev-plugins] serving from source: ${plugins
            .map(p => `${p.code} (${relative(root, p.entry)})`)
            .join(', ')}`
        );
      }
      return renderDevPluginsModule(plugins);
    },
  };
};
