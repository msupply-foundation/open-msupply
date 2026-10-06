/*
 * Build one plugin's bundle and install it on a dev server — the step the
 * dev loop cannot do on its own.
 *
 * `OMS_PLUGIN_DIRS=… pnpm dev` serves a plugin's BROWSER half from source,
 * but a form plugin's schemas and registry entries live on the SERVER, which
 * learns them only from an installed bundle: without one, every save of a
 * plugin document fails schema lookup. So this packs the bundle exactly as
 * a deployment gets it (`pnpm build:plugins`) and installs it through the
 * same CLI path a deployment uses (`remote_server_cli install-plugin-bundle`).
 *
 *   pnpm plugin:install <plugin directory or code>
 *     [--program <programKey>=<programId>]...   the program for a key; every
 *                                               key needs one on first install
 *     [--take-over <documentType>]...           adopt an existing registry
 *                                               entry no plugin owns
 *     [--blank-old-ui <documentType>]...        let a taken-over type's form
 *                                               go blank on old-client sites
 *                                               (it has no legacyUiSchema)
 *     [--dry-run]                               build, then print the command
 *
 * The server is OMS_URL (default http://localhost:8000), logged in as
 * OMS_USERNAME / OMS_PASSWORD. The CLI is the debug build in
 * `../server/target` (or CARGO_TARGET_DIR, as for the e2e runner), and runs
 * from `../server`, because it reads its configuration from the working
 * directory before it does anything else.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envPluginDirs, inRepoPluginDirs } from './pluginDirs.mjs';

const FRONTEND_DIR = fileURLToPath(new URL('..', import.meta.url));
const SERVER_DIR = resolve(FRONTEND_DIR, '../server');
const BUNDLE_DIR = join(FRONTEND_DIR, 'dist/bundles');
const DEFAULT_URL = 'http://localhost:8000';

const USAGE =
  'usage: pnpm plugin:install <plugin directory or code> ' +
  '[--program <programKey>=<programId>]... [--take-over <documentType>]... ' +
  '[--blank-old-ui <documentType>]... [--dry-run]';

const fail = message => {
  console.error(`[plugin:install] ${message}`);
  process.exit(1);
};

// ── Arguments ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const programs = [];
const takeOvers = [];
const blankOldUis = [];
let target;
let dryRun = false;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  // `--name value` and `--name=value` both, for the repeatable options.
  const [flag, inline] = arg.startsWith('--') ? arg.split(/=(.*)/s) : [arg];
  const value = () => {
    const next = inline ?? args[++i];
    if (next === undefined || next.startsWith('--')) {
      fail(`${flag} needs a value\n${USAGE}`);
    }
    return next;
  };
  if (flag === '--program') {
    const pair = value();
    if (!/^[^=]+=.+$/.test(pair)) {
      fail(`--program takes <programKey>=<programId>, got "${pair}"`);
    }
    programs.push(pair);
  } else if (flag === '--take-over') {
    takeOvers.push(value());
  } else if (flag === '--blank-old-ui') {
    blankOldUis.push(value());
  } else if (flag === '--dry-run') {
    dryRun = true;
  } else if (flag === '--help' || flag === '-h') {
    console.info(USAGE);
    process.exit(0);
  } else if (arg.startsWith('-')) {
    fail(`unknown option ${arg}\n${USAGE}`);
  } else if (target === undefined) {
    target = arg;
  } else {
    fail(`one plugin at a time — got "${target}" and "${arg}"\n${USAGE}`);
  }
}
if (target === undefined) fail(USAGE);

// ── Environment ─────────────────────────────────────────────────────────────

const url = process.env.OMS_URL || DEFAULT_URL;
const username = process.env.OMS_USERNAME;
const password = process.env.OMS_PASSWORD;
const missing = [
  ...(username ? [] : ['OMS_USERNAME']),
  ...(password ? [] : ['OMS_PASSWORD']),
];
if (missing.length > 0 && !dryRun) {
  fail(
    `set ${missing.join(' and ')} to a user on ${url} who may install ` +
      'plugins (a central server admin)'
  );
}

const cli = join(
  resolve(SERVER_DIR, process.env.CARGO_TARGET_DIR ?? 'target'),
  'debug',
  'remote_server_cli'
);
if (!existsSync(cli)) {
  const message =
    `the server CLI is not built (looked for ${cli}) — run ` +
    '`cargo build --bin remote_server_cli` in ../server';
  if (!dryRun) fail(message);
  console.warn(`[plugin:install] ${message}`);
}

// ── Which plugin ────────────────────────────────────────────────────────────

/*
 * A directory names its plugin by its manifest's `name`, the plugin code the
 * bundle is written under. Anything else is taken as a code. A directory
 * build-plugins.mjs would not discover is added to OMS_PLUGIN_DIRS for the
 * build, so an out-of-tree checkout installs without further setup.
 */
const buildEnv = { ...process.env };
let code = target;
const manifestPath = join(target, 'package.json');
if (existsSync(manifestPath)) {
  code = JSON.parse(readFileSync(manifestPath, 'utf8')).name;
  if (typeof code !== 'string' || code === '') {
    fail(`${manifestPath} has no "name" — the name is the plugin code`);
  }
  const known = [...inRepoPluginDirs(), ...envPluginDirs()].map(dir =>
    resolve(dir)
  );
  if (!known.includes(resolve(target))) {
    buildEnv.OMS_PLUGIN_DIRS = [...envPluginDirs(), resolve(target)].join(',');
  }
} else if (target.includes('/')) {
  fail(`${target}: not a plugin directory (no package.json)`);
}

// ── Build ───────────────────────────────────────────────────────────────────

const built = spawnSync(
  process.execPath,
  [join(FRONTEND_DIR, 'scripts/build-plugins.mjs')],
  { cwd: FRONTEND_DIR, env: buildEnv, stdio: 'inherit' }
);
if (built.status !== 0) fail('pnpm build:plugins failed — nothing installed');

const bundlePath = join(BUNDLE_DIR, `${code}.json`);
if (!existsSync(bundlePath)) {
  fail(
    `no bundle for plugin code "${code}" in dist/bundles/ — is it a ` +
      'discovered plugin? (in-repo, or named by OMS_PLUGIN_DIRS)'
  );
}

/*
 * A form plugin's program keys each need a program on FIRST install, and a
 * re-install keeps the existing choice unless it is passed again — so a key
 * without a --program is not an error here, only worth naming. The server
 * refuses the install if a key has no program at all, and lists its programs.
 */
const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
for (const form of bundle.form_plugins ?? []) {
  const chosen = new Set(programs.map(pair => pair.split('=')[0]));
  const unchosen = form.program_keys.filter(key => !chosen.has(key));
  const types = form.document_types.map(entry => entry.document_type);
  console.info(
    `[plugin:install] ${code} carries document types ${types.join(', ')}`
  );
  if (unchosen.length > 0) {
    console.info(
      `[plugin:install] no --program for ${unchosen.join(', ')}: fine on a ` +
        're-install (the existing choice is kept), refused on a first one'
    );
  }
}

// ── Install ─────────────────────────────────────────────────────────────────

const cliArgs = [
  'install-plugin-bundle',
  '--path',
  bundlePath,
  '--url',
  url,
  '--username',
  username ?? '<OMS_USERNAME>',
  '--password',
  password ?? '<OMS_PASSWORD>',
  ...programs.flatMap(pair => ['--program', pair]),
  ...takeOvers.flatMap(documentType => ['--take-over', documentType]),
  ...blankOldUis.flatMap(documentType => ['--blank-old-ui', documentType]),
];

if (dryRun) {
  const shown = cliArgs.map((arg, i) =>
    cliArgs[i - 1] === '--password' && password ? '***' : arg
  );
  console.info(
    `[plugin:install] dry run — would run, from ${SERVER_DIR}:\n  ${cli} ` +
      shown.join(' ')
  );
  process.exit(0);
}

console.info(`[plugin:install] installing ${bundlePath} on ${url}`);
const installed = spawnSync(cli, cliArgs, {
  cwd: SERVER_DIR,
  stdio: 'inherit',
});
if (installed.status !== 0) {
  fail(`install failed (remote_server_cli exited ${installed.status})`);
}
console.info(`[plugin:install] installed ${code} on ${url}`);
