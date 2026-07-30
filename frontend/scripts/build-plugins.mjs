/*
 * Build + pack frontend plugins.
 *
 * For each discovered plugin (in-repo `examples/*`, plus anything named by
 * OMS_PLUGIN_DIRS) this:
 *   1. builds it to a single-file ES module
 *   `dist/frontend_plugins/{code}/{code}.js`
 *      through the shared preset (vite/pluginBuild.ts) — shared specifiers stay
 *      bare, resolved at runtime by the host's import map;
 *   2. packs every plugin into `dist/bundle.json` — the installable server
 *      artifact, byte-for-byte in the format `remote_server_cli
 *      generate-plugin-bundle` produces;
 *   3. writes `dist/frontend_plugins/metadata.json`, the
 *   `frontendPluginMetadata`
 *      discovery response, so the built app can load them through its
 *      production path without a server.
 *
 * Faithfulness rules, mirrored from server/cli/src/plugins.rs and
 * server/service/src/plugin/mod.rs — deviating breaks install or cache-busting:
 *   - entry_point = the dist file whose name starts with the plugin code;
 *   - files starting with "main" or containing "LICENSE" are skipped;
 *   - id = `frontend_{code}_{version with dots as underscores}`;
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
import { pluginViteConfig } from '../vite/pluginBuild.ts';

const OUT_DIR = 'dist/frontend_plugins';

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

const discoverPlugins = () => {
  const dirs = [];
  if (existsSync('examples')) {
    for (const entry of readdirSync('examples', { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(join('examples', entry.name));
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
  /* eslint-disable camelcase -- the Rust FrontendPluginRow's field names. */
  const row = {
    id: `frontend_${plugin.code}_${versionId}`,
    code: plugin.code,
    version: plugin.version,
    entry_point: entryPoint,
    types: plugin.types,
    files,
  };
  /* eslint-enable camelcase */

  const hasher = createHash('sha256');
  for (const file of [...files].sort(byName)) {
    hasher.update(Buffer.from(file.file_name, 'utf8'));
    hasher.update(Buffer.from(file.file_content_base64, 'base64'));
  }
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
if (plugins.length === 0) {
  console.warn('[build-plugins] no plugins discovered');
  process.exit(0);
}

for (const plugin of plugins) await buildPlugin(plugin);

const packed = plugins.map(packPlugin);
verifyRoundTrip(packed.map(p => p.row));

mkdirSync(OUT_DIR, { recursive: true });
/* eslint-disable camelcase -- Rust PluginBundle's field names. */
writeFileSync(
  'dist/bundle.json',
  JSON.stringify(
    { backend_plugins: [], frontend_plugins: packed.map(p => p.row) },
    null,
    2
  )
);
/* eslint-enable camelcase */
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
console.info(
  `[build-plugins] packed ${packed.length}; round-trip verified; ` +
    'wrote dist/bundle.json + dist/frontend_plugins/metadata.json'
);
