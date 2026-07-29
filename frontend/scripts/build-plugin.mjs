/*
 * Build one in-repo country plugin into a server-installable bundle.
 *
 *   pnpm build:plugin civ          (or: PLUGIN=civ pnpm build:plugin)
 *
 * Two artefacts:
 *   plugins/<dir>/dist/<code>.js   the single ES module the server serves
 *   plugins/<dir>/bundle.json      the installable bundle
 *
 * `bundle.json` is written HERE rather than by the server's
 * `remote_server_cli generate-plugin-bundle`, which hardcodes `yarn install` +
 * `yarn build-plugin` in each plugin directory — this repo is pnpm
 * (kdd/package-manager) and its plugins build with the shared vite config, not
 * a per-plugin one. The JSON shape below is the CLI's, byte-for-byte, so
 * `remote_server_cli install-plugin-bundle -p bundle.json --url … ` accepts it
 * unchanged; the server hashes the files itself and serves them at
 * /frontend_plugins/{code}/{entry}?v={hash}.
 *
 * A bundle that also ships a BACKEND half (CIV does — the AMC/DOS calculations)
 * is still assembled in its own repo: this writes the frontend entry only, and
 * the two halves are merged there. Deliberate: the backend half is out of scope
 * for the frontend rewrite and its build is unaffected by it.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const directory = process.env.PLUGIN || process.argv[2];

if (!directory) {
  console.error(
    'Usage: pnpm build:plugin <plugins/ subdirectory>   e.g. pnpm build:plugin civ'
  );
  process.exit(1);
}

const pluginDir = join(root, 'plugins', directory);
const manifest = JSON.parse(
  readFileSync(join(pluginDir, 'package.json'), 'utf8')
);
const code = manifest.name;
const version = manifest.version;
const types = manifest.omSupplyPlugin?.types ?? [];

if (manifest.omSupplyPlugin?.target !== 'frontend') {
  console.error(
    `plugins/${directory}: omSupplyPlugin.target must be "frontend" (got ${manifest.omSupplyPlugin?.target})`
  );
  process.exit(1);
}

console.info(`building ${code}@${version} from plugins/${directory} ...`);
execFileSync(
  'pnpm',
  ['exec', 'vite', 'build', '--config', 'vite.plugin.config.ts'],
  { cwd: root, stdio: 'inherit', env: { ...process.env, PLUGIN: directory } }
);

/*
 * The transport's rules, asserted rather than assumed: files named `main*` or
 * containing `LICENSE` are DROPPED in transit, and the entry is "a file whose
 * name starts with the plugin code". A build that emitted a stray `<code>.css`
 * would install with a stylesheet as its entry point and fail at runtime, so
 * catch it here where the message can say so.
 */
const emitted = readdirSync(join(pluginDir, 'dist')).sort();
const dropped = emitted.filter(
  name => name.startsWith('main') || name.includes('LICENSE')
);
if (dropped.length > 0) {
  console.error(
    `plugins/${directory}/dist contains files the transport drops: ${dropped.join(', ')}`
  );
  process.exit(1);
}
const nonJs = emitted.filter(name => !name.endsWith('.js'));
if (nonJs.length > 0) {
  console.error(
    `plugins/${directory}/dist must contain JS only (the server serves every ` +
      `plugin file as application/javascript, and entry detection is by name ` +
      `prefix): found ${nonJs.join(', ')}. Inline CSS with ?inline instead.`
  );
  process.exit(1);
}
const entry = `${code}.js`;
if (!emitted.includes(entry)) {
  console.error(
    `plugins/${directory}/dist has no ${entry} — the entry file name must start with the plugin code`
  );
  process.exit(1);
}
/*
 * More than one file is a hard error, not a note: the transport serves a single
 * entry and its detection is by name prefix, so a second chunk would either be
 * picked as the entry or 404 when the entry dynamic-imports it. This assertion
 * exists because the Vite option that guarantees one chunk is easy to get wrong
 * silently (see vite.plugin.config.ts) — the artefact is checked, not the flag.
 */
if (emitted.length > 1) {
  console.error(
    `plugins/${directory}/dist must contain exactly one file; got ${emitted.length} ` +
      `(${emitted.join(', ')}). The bundle must be a single ES module — check the ` +
      `one-chunk output options in vite.plugin.config.ts.`
  );
  process.exit(1);
}

/*
 * snake_case throughout: these are the server's field names, deserialized
 * straight into its `PluginBundle` Rust struct. Renaming one to satisfy the
 * repo's camelCase rule would produce a bundle the CLI rejects.
 */
/* eslint-disable camelcase */
const bundle = {
  backend_plugins: [],
  frontend_plugins: [
    {
      id: `frontend_${code}_${version.replaceAll('.', '_')}`,
      code,
      version,
      entry_point: entry,
      types,
      files: emitted.map(name => ({
        file_name: name,
        file_content_base64: readFileSync(
          join(pluginDir, 'dist', name)
        ).toString('base64'),
      })),
    },
  ],
};
/* eslint-enable camelcase */

const bundlePath = join(pluginDir, 'bundle.json');
writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);

const bytes = readFileSync(join(pluginDir, 'dist', entry)).byteLength;
console.info(
  `\n${entry}  ${(bytes / 1024).toFixed(1)} KB raw` +
    `\nbundle: plugins/${directory}/bundle.json` +
    `\ninstall: remote_server_cli install-plugin-bundle -p plugins/${directory}/bundle.json --url <central> --username <user> --password <pass>`
);
