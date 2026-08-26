/*
 * Build + pack frontend plugins.
 *
 * For each discovered plugin (in-repo `examples/*` and `plugins/*`, plus
 * anything named by OMS_PLUGIN_DIRS) this:
 *   1. builds it to a single-file ES module
 *      `dist/frontend_plugins/{code}/{code}.js`
 *      through the shared preset (vite/pluginBuild.ts) — shared specifiers stay
 *      bare, resolved at runtime by the host's import map;
 *   2. packs it into `dist/bundles/{code}.json` — ONE BUNDLE PER PLUGIN, the
 *      installable server artifact, byte-for-byte in the format
 *      `remote_server_cli generate-plugin-bundle` produces. Both of a plugin's
 *      halves go in its own bundle and nobody else's; a plugin's BACKEND half
 *      (`plugins/<dir>/backend`, a BoaJS bundle built by the open-msupply
 *      client toolchain) is packed VERBATIM from its committed
 *      `prebuilt/plugin.js` — never rebuilt, re-encoded or reformatted here,
 *      the same rule as civ-plugins' make-bundle.mjs: the backend half moves
 *      only when its own build runs;
 *   3. writes `dist/frontend_plugins/metadata.json`, the
 *      `frontendPluginMetadata` discovery response, so the built app can load
 *      them through its production path without a server.
 *
 * Faithfulness rules, mirrored from server/cli/src/plugins.rs and
 * server/service/src/plugin/mod.rs — deviating breaks install or cache-busting:
 *   - entry_point = the dist file whose name starts with the plugin code;
 *   - files starting with "main" or containing "LICENSE" are skipped;
 *   - id = `frontend_{code}_{host_runtime}_{version with dots as underscores}`
 *     — the runtime is in there because one plugin ships a bundle per host and
 *     the two can share a version, and install is a blind upsert, so an id of
 *     code+version alone would make the second bundle silently overwrite the
 *     first on the primary key. It is also what the file route is keyed on now
 *     that a server keeps every compatible version of a code;
 *   - host_runtime = the SDK's HOST_RUNTIME, which says this bundle is for THIS
 *     host: a server offers it only to a client declaring the same runtime;
 *   - hash = sha256 over the files sorted by name, name bytes then content
 *     bytes, hex — the server computes this at bind time and the client appends
 *     it as `?v=`.
 *
 * Usage: pnpm build:plugins   [OMS_PLUGIN_DIRS=../civ-plugins/frontend/latest]
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'vite';
import { HOST_RUNTIME } from '../src/plugin-sdk/apiVersion.ts';
import { pluginViteConfig } from '../vite/pluginBuild.ts';
import { backendPluginViteConfig } from '../vite/backendPluginBuild.ts';

const OUT_DIR = 'dist/frontend_plugins';
const BACKEND_OUT_DIR = 'dist/backend_plugins';
const BUNDLE_DIR = 'dist/bundles';

// Where a plugin's entry module may live, in preference order. `plugin.tsx` at
// the root is the examples' shape; `src/plugin.ts(x)` is the out-of-tree one.
const ENTRY_CANDIDATES = [
  'plugin.tsx',
  'plugin.ts',
  'src/plugin.tsx',
  'src/plugin.ts',
];

const readManifest = dir => {
  const manifestPath = join(dir, 'package.json');
  if (!existsSync(manifestPath)) return undefined;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  // The CLI walks every package.json and ignores the ones without the key, so
  // a plugin directory is exactly one that declares a frontend target.
  if (manifest.omSupplyPlugin?.target !== 'frontend') return undefined;
  const entry = ENTRY_CANDIDATES.find(candidate =>
    existsSync(join(dir, candidate))
  );
  if (!entry) {
    throw new Error(
      `${dir}: no plugin entry found (looked for ${ENTRY_CANDIDATES.join(', ')})`
    );
  }
  return {
    dir,
    entry,
    code: manifest.name,
    version: manifest.version ?? '0.0.0',
    types: manifest.omSupplyPlugin.types ?? [],
  };
};

/*
 * Backend halves: `<root>/<dir>/backend/package.json` declaring a backend
 * target. The row mirrors the Rust BackendPluginRow — `variant_type` comes
 * from the manifest (BOA_JS), and the id convention matches the server CLI's
 * `backend_{code}_{version}`.
 *
 * TWO SOURCES, and a committed build always wins:
 *   - `prebuilt/plugin.js` — packed VERBATIM, never rebuilt or re-encoded.
 *     This is how a deployed country plugin ships: CIV's is built by the
 *     open-msupply client toolchain and moves only when that build runs, so
 *     touching it here would break byte-identity with the field bundle.
 *   - `src/plugin.ts` — built here (vite/backendPluginBuild.ts) for a plugin
 *     whose source this repo owns, which today is the reference plugin. A
 *     bundle built here is NOT byte-comparable with a webpack-built one; that
 *     is exactly why a prebuilt takes precedence rather than being refreshed.
 */
const BACKEND_ENTRY = 'src/plugin.ts';

const readBackendManifest = dir => {
  const manifestPath = join(dir, 'package.json');
  if (!existsSync(manifestPath)) return undefined;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.omSupplyPlugin?.target !== 'backend') return undefined;
  const prebuilt = join(dir, 'prebuilt/plugin.js');
  const entry = existsSync(join(dir, BACKEND_ENTRY))
    ? BACKEND_ENTRY
    : undefined;
  if (!existsSync(prebuilt) && !entry) {
    throw new Error(
      `${dir}: declares a backend plugin but has neither prebuilt/plugin.js ` +
        `nor ${BACKEND_ENTRY} — ship a committed build (packed verbatim, see ` +
        'plugins/civ/backend/README.md) or source to build from'
    );
  }
  const code = manifest.name;
  return {
    dir,
    code,
    // A prebuilt is the shipped artifact; source is only built when there is
    // none, so a plugin can carry its source without its bundle drifting.
    prebuilt: existsSync(prebuilt) ? prebuilt : undefined,
    entry: existsSync(prebuilt) ? undefined : entry,
    outDir: resolve(BACKEND_OUT_DIR, code),
    version: manifest.version ?? '0.0.0',
    types: manifest.omSupplyPlugin.types ?? [],
    variantType: manifest.omSupplyPlugin.variant_type,
  };
};

/** The single file a backend plugin packs from, built or committed. */
const backendBundlePath = plugin =>
  plugin.prebuilt ?? join(plugin.outDir, 'plugin.js');

const buildBackendPlugin = plugin =>
  build(
    backendPluginViteConfig({
      code: plugin.code,
      entry: plugin.entry,
      outDir: plugin.outDir,
      root: plugin.dir,
    })
  );

const discoverBackendPlugins = () => {
  const found = [];
  // Both roots, like the frontend walk: `examples/*` proves the mechanism,
  // `plugins/*` holds the real country plugins.
  for (const [root, entry] of ['examples', 'plugins'].flatMap(root =>
    existsSync(root)
      ? readdirSync(root, { withFileTypes: true }).map(e => [root, e])
      : []
  )) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    const manifest = readBackendManifest(join(dir, 'backend'));
    if (!manifest) continue;
    /*
     * A plugin may ship either half alone — plenty of country plugins are
     * backend-only (BES, Niger, São Tomé all bundle `frontend_plugins: []`).
     * But where ONE directory holds both, they are two halves of one plugin
     * and the code has to match: it is what pairs them into a bundle, routes
     * the frontend's bridge calls to this backend, and stamps the stored rows.
     * A typo here would ship two unrelated plugins that silently never talk.
     */
    const frontend = readManifest(dir);
    if (frontend && frontend.code !== manifest.code) {
      throw new Error(
        `${dir}: the two halves declare different plugin codes — ` +
          `"${frontend.code}" (package.json) vs "${manifest.code}" ` +
          '(backend/package.json). Two halves of one plugin share one code.'
      );
    }
    found.push(manifest);
  }
  return found;
};

const packBackendPlugin = plugin => {
  const bytes = readFileSync(backendBundlePath(plugin));
  /* eslint-disable camelcase -- the Rust BackendPluginRow's field names. */
  return {
    id: `backend_${plugin.code}_${plugin.version.replaceAll('.', '_')}`,
    code: plugin.code,
    version: plugin.version,
    bundle_base64: bytes.toString('base64'),
    types: plugin.types,
    variant_type: plugin.variantType,
  };
  /* eslint-enable camelcase */
};

const discoverPlugins = () => {
  const dirs = [];
  // The reference plugins and the in-repo country plugins — the same pair the
  // dev loop walks (vite/devPlugins.ts).
  for (const inRepo of ['examples', 'plugins']) {
    if (!existsSync(inRepo)) continue;
    for (const entry of readdirSync(inRepo, { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(join(inRepo, entry.name));
    }
  }
  // Out-of-tree plugin checkouts (the civ-plugins dev loop), comma- or
  // colon-separated.
  for (const dir of (process.env.OMS_PLUGIN_DIRS ?? '')
    .split(/[,:]/)
    .filter(Boolean)) {
    dirs.push(dir);
  }
  return dirs.map(readManifest).filter(Boolean);
};

const buildPlugin = plugin =>
  build(
    pluginViteConfig({
      code: plugin.code,
      entry: plugin.entry,
      outDir: resolve(OUT_DIR, plugin.code),
      version: plugin.version,
      // Vite resolves `entry` against the root, so each plugin builds from its
      // own directory (its node_modules, its tsconfig).
      root: plugin.dir,
    })
  );

// Bytewise (not locale) comparison, matching Rust's String Ord — the hash
// depends on this ordering.
const byName = (a, b) =>
  a.file_name < b.file_name ? -1 : a.file_name > b.file_name ? 1 : 0;

const packPlugin = plugin => {
  const dir = join(OUT_DIR, plugin.code);
  const files = [];
  let entryPoint;
  for (const dirent of readdirSync(dir, { withFileTypes: true })) {
    if (!dirent.isFile()) continue;
    const name = dirent.name;
    if (name.startsWith('main') || name.includes('LICENSE')) continue;
    const bytes = readFileSync(join(dir, name));
    /* eslint-disable camelcase -- Rust FrontendPluginFile's field names. */
    files.push({
      file_name: name,
      file_content_base64: bytes.toString('base64'),
    });
    /* eslint-enable camelcase */
    if (name.startsWith(plugin.code)) entryPoint = name;
  }
  if (!entryPoint) {
    throw new Error(`No entry file starting with "${plugin.code}" in ${dir}`);
  }

  const versionId = plugin.version.replaceAll('.', '_');
  const runtimeId = HOST_RUNTIME.replaceAll('.', '_');
  /* eslint-disable camelcase -- the Rust FrontendPluginRow's field names. */
  const row = {
    id: `frontend_${plugin.code}_${runtimeId}_${versionId}`,
    code: plugin.code,
    version: plugin.version,
    entry_point: entryPoint,
    types: plugin.types,
    files,
    /*
     * The second compatibility axis: which HOST can load this bundle, as
     * against `version`'s which SERVER can serve it. Taken from the SDK the
     * plugin was just built against rather than from its manifest, so it is
     * true by construction and cannot drift from what the module declares at
     * runtime.
     *
     * A server matches it for exact equality against the runtime the asking
     * client declares, and never orders it — a bundle exporting Solid
     * components cannot be rendered by a React host whichever of the two is
     * newer, and both hosts run under one server version for the whole
     * rollout, so nothing on the version line can separate them.
     *
     * The plugin-API integer is NOT packed alongside it. That gate is
     * module-side and stays there (spec/plugins/sdk-contract.md § versioning):
     * `examples/api_too_new` declares 999 in its MODULE and is refused by the
     * loader after the bundle evaluates, which is the gate that fixture exists
     * to exercise.
     *
     * Not overridable per plugin, deliberately.
     */
    host_runtime: HOST_RUNTIME,
  };
  /* eslint-enable camelcase */

  const hasher = createHash('sha256');
  for (const file of [...files].sort(byName)) {
    hasher.update(Buffer.from(file.file_name, 'utf8'));
    hasher.update(Buffer.from(file.file_content_base64, 'base64'));
  }
  // `path` here describes the STATIC dist layout this script writes
  // (`{code}/{entry}`), which is why it no longer matches what a server
  // returns: a server holds several bundles per code and addresses them by row
  // id, whereas one dist directory holds exactly one build of each.
  const meta = {
    code: plugin.code,
    path: `${plugin.code}/${entryPoint}`,
    hash: hasher.digest('hex'),
  };

  return { row, meta };
};

// Every base64 blob must decode back to the exact bytes on disk — proves the
// install → serve round trip reproduces what the app imports.
const verifyRoundTrip = rows => {
  for (const row of rows) {
    for (const file of row.files) {
      const onDisk = readFileSync(join(OUT_DIR, row.code, file.file_name));
      const packed = Buffer.from(file.file_content_base64, 'base64');
      if (Buffer.compare(onDisk, packed) !== 0) {
        throw new Error(
          `Round-trip mismatch for ${row.code}/${file.file_name}`
        );
      }
    }
  }
};

const plugins = discoverPlugins();
const backendPlugins = discoverBackendPlugins();
if (plugins.length === 0 && backendPlugins.length === 0) {
  console.warn('[build-plugins] no plugins discovered');
  process.exit(0);
}

for (const plugin of plugins) await buildPlugin(plugin);
// Only the ones with source and no committed build — a prebuilt is shipped as
// it stands (readBackendManifest).
for (const plugin of backendPlugins) {
  if (plugin.entry) await buildBackendPlugin(plugin);
}

const packed = plugins.map(packPlugin);
verifyRoundTrip(packed.map(p => p.row));

// The same proof for the backend rows: each blob must decode back to the exact
// bytes on disk — packing is transport, never transformation. For a prebuilt
// that is the committed artifact; for a built one, what the build just wrote.
const backendRows = backendPlugins.map(packBackendPlugin);
for (const [i, row] of backendRows.entries()) {
  const onDisk = readFileSync(backendBundlePath(backendPlugins[i]));
  if (Buffer.compare(onDisk, Buffer.from(row.bundle_base64, 'base64')) !== 0) {
    throw new Error(`Round-trip mismatch for ${row.id}`);
  }
}

/*
 * ONE BUNDLE PER PLUGIN, keyed by plugin code — never a shared one.
 *
 * A bundle is what gets installed on a central server, and a deployment
 * installs the plugins it wants, not everything this repo happens to hold: a
 * shared bundle would put `api_too_new` (which exists to be refused by the
 * loader) on a CIV server. Installing is an additive per-row upsert
 * (server/service/src/plugin/mod.rs § install_uploaded_plugin), so N bundles
 * install exactly like one, and a bundle never removes a plugin absent from
 * it.
 *
 * The code is also what pairs a plugin's halves where it HAS two —
 * `plugins/civ` and `plugins/civ/backend` both declare `civ_plugins` — so
 * grouping by it puts both in one bundle, the unit that has to be installed
 * together. A plugin with only one half (frontend-only like the examples,
 * backend-only like BES) simply gets a bundle with one populated list;
 * nothing here requires a pair.
 */
const bundles = new Map();
/* eslint-disable camelcase -- Rust PluginBundle's field names. */
const bundleFor = code => {
  const existing = bundles.get(code);
  if (existing) return existing;
  const bundle = { backend_plugins: [], frontend_plugins: [] };
  bundles.set(code, bundle);
  return bundle;
};
for (const { row } of packed) bundleFor(row.code).frontend_plugins.push(row);
for (const row of backendRows) bundleFor(row.code).backend_plugins.push(row);
/* eslint-enable camelcase */

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(BUNDLE_DIR, { recursive: true });
for (const [code, bundle] of bundles) {
  writeFileSync(
    join(BUNDLE_DIR, `${code}.json`),
    JSON.stringify(bundle, null, 2)
  );
}
// metadata.json stays whole-repo: it is the built app's own discovery response
// (`frontendPluginMetadata`), so a `pnpm preview` build can load every plugin
// it built. Loading is not installing — nothing here reaches a server.
writeFileSync(
  join(OUT_DIR, 'metadata.json'),
  JSON.stringify(
    packed.map(p => p.meta),
    null,
    2
  )
);

for (const { row, meta } of packed) {
  const bytes = readFileSync(join(OUT_DIR, row.code, row.entry_point)).length;
  console.info(
    `[build-plugins] ${row.code}@${row.version}  ${row.entry_point}  ` +
      `${(bytes / 1024).toFixed(1)} KB  ${meta.hash.slice(0, 12)}`
  );
}
for (const [i, row] of backendRows.entries()) {
  const bytes = Buffer.from(row.bundle_base64, 'base64').length;
  // Which source it came from, named: a prebuilt shipping verbatim and a
  // bundle this run produced are very different things to be looking at when
  // a backend plugin misbehaves.
  const origin = backendPlugins[i].prebuilt ? 'prebuilt, verbatim' : 'built';
  console.info(
    `[build-plugins] ${row.id}  ${row.variant_type}  ` +
      `${(bytes / 1024).toFixed(1)} KB  ${origin}  [${row.types.join(', ')}]`
  );
}
for (const [code, bundle] of bundles) {
  // Either count may be 0: a plugin ships a frontend half, a backend half, or
  // both, and all three are ordinary.
  const rows =
    `${bundle.frontend_plugins.length} frontend + ` +
    `${bundle.backend_plugins.length} backend`;
  console.info(`[build-plugins] ${join(BUNDLE_DIR, `${code}.json`)}  ${rows}`);
}
console.info(
  `[build-plugins] packed ${packed.length} frontend + ${backendRows.length} ` +
    `backend into ${bundles.size} per-plugin bundle(s); round-trip verified; ` +
    `wrote ${BUNDLE_DIR}/ + ${OUT_DIR}/metadata.json`
);
