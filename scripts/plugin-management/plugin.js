#!/usr/bin/env node
// CLI for managing local plugin submodules. See docs/content/client/packages/plugins/_index.md.

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PLUGINS_DIR = path.join('client', 'packages', 'plugins');
const MAP_DIR = path.join('scripts', 'plugin-management');
const MAP_FILE = path.join(REPO_ROOT, MAP_DIR, 'pluginRepoMap.json');
const EXAMPLE_MAP_FILE = path.join(MAP_DIR, 'pluginRepoMap.example.json');
const AUTH_FILE = path.join(REPO_ROOT, MAP_DIR, '.pluginAuth');
const GITMODULES = path.join(REPO_ROOT, '.gitmodules');

const INSTALL_DEFAULTS = {
  url: 'http://localhost:8000',
  username: 'admin',
  password: 'pass',
};

function die(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function info(msg) {
  console.log(msg);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    ...opts,
  });
  if (result.status !== 0) {
    die(`${cmd} ${args.join(' ')} failed (exit ${result.status})`);
  }
}

function runCapture(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    ...opts,
  });
}

function parseGitmodulesPaths() {
  if (!fs.existsSync(GITMODULES)) return [];
  const content = fs.readFileSync(GITMODULES, 'utf8');
  const paths = [];
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*path\s*=\s*(.+)\s*$/);
    if (m) paths.push(m[1].trim());
  }
  return paths;
}

function findExistingPluginPaths() {
  const set = new Set();
  for (const p of parseGitmodulesPaths()) {
    if (p.startsWith(PLUGINS_DIR + path.sep) || p.startsWith(PLUGINS_DIR + '/')) {
      set.add(p);
    }
  }
  const fullPluginsDir = path.join(REPO_ROOT, PLUGINS_DIR);
  if (fs.existsSync(fullPluginsDir)) {
    for (const entry of fs.readdirSync(fullPluginsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const rel = path.join(PLUGINS_DIR, entry.name);
      const full = path.join(REPO_ROOT, rel);
      // Treat as a plugin submodule if it has a .git file/dir, or is listed in .gitmodules.
      if (fs.existsSync(path.join(full, '.git'))) set.add(rel);
    }
  }
  return [...set];
}

function isSubmoduleDirty(submodulePath) {
  const full = path.join(REPO_ROOT, submodulePath);
  if (!fs.existsSync(full)) return false;
  try {
    const out = execFileSync('git', ['-C', full, 'status', '--porcelain'], {
      encoding: 'utf8',
    });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

function removeSubmodule(submodulePath) {
  info(`removing submodule ${submodulePath}`);
  // Best-effort git cleanup — stay quiet if these don't apply. With .gitmodules
  // gitignored the submodule is usually not in the git index, so deinit/rm error
  // out; that's fine, the filesystem cleanup below is what actually matters.
  spawnSync('git', ['submodule', 'deinit', '-f', submodulePath], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
  });
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', submodulePath], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
  });
  if (tracked.status === 0) {
    spawnSync('git', ['rm', '-f', submodulePath], {
      cwd: REPO_ROOT,
      stdio: 'ignore',
    });
  }
  fs.rmSync(path.join(REPO_ROOT, submodulePath), { recursive: true, force: true });
  fs.rmSync(path.join(REPO_ROOT, '.git', 'modules', submodulePath), {
    recursive: true,
    force: true,
  });
}

function resetAllPlugins() {
  const existing = findExistingPluginPaths();
  if (existing.length === 0 && !fs.existsSync(GITMODULES)) {
    info('no plugin submodules to reset');
    return;
  }
  const dirty = existing.filter(isSubmoduleDirty);
  if (dirty.length > 0) {
    die(
      `the following plugin submodule(s) have uncommitted changes:\n` +
        dirty.map(p => `  - ${p}`).join('\n') +
        `\ncommit or stash inside the submodule, then re-run.`
    );
  }
  for (const p of existing) removeSubmodule(p);
  if (fs.existsSync(GITMODULES)) {
    fs.rmSync(GITMODULES, { force: true });
    info('removed .gitmodules');
  }
}

function readMap() {
  if (!fs.existsSync(MAP_FILE)) {
    const relMap = path.join(MAP_DIR, 'pluginRepoMap.json');
    die(
      `${relMap} not found.\n` +
        `create one based on ${EXAMPLE_MAP_FILE}, e.g.:\n` +
        `  cp ${EXAMPLE_MAP_FILE} ${relMap}`
    );
  }
  try {
    return JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
  } catch (e) {
    die(`failed to parse ${MAP_FILE}: ${e.message}`);
  }
}

function folderNameFromUrl(url) {
  // strip trailing slash and .git, then take basename
  const cleaned = url.replace(/\/+$/, '').replace(/\.git$/, '');
  return path.basename(cleaned);
}

function cmdGet(args) {
  const positional = [];
  let branch = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-b' || a === '--branch') {
      branch = args[++i];
      if (!branch) die('-b requires a branch name');
    } else if (a.startsWith('-')) {
      die(`unknown flag for get: ${a}`);
    } else {
      positional.push(a);
    }
  }
  if (positional.length !== 1) {
    die('usage: yarn plugin get <name> [-b <branch>]');
  }
  const name = positional[0];
  const map = readMap();
  const url = map[name];
  if (!url) {
    const known = Object.keys(map).join(', ') || '(none)';
    die(`no entry for "${name}" in pluginRepoMap.json. known: ${known}`);
  }

  resetAllPlugins();

  const folder = folderNameFromUrl(url);
  const submodulePath = path.posix.join(
    'client',
    'packages',
    'plugins',
    folder
  );
  // .gitmodules is gitignored in this repo. `git submodule add` refuses unless
  // the file already exists in the working tree, so touch it first; --force then
  // bypasses the gitignore check on the submodule path itself.
  if (!fs.existsSync(GITMODULES)) fs.writeFileSync(GITMODULES, '');
  const submoduleArgs = ['submodule', 'add', '--force'];
  if (branch) submoduleArgs.push('-b', branch);
  submoduleArgs.push(url, submodulePath);
  info(`adding submodule ${submodulePath}${branch ? ` (branch ${branch})` : ''}`);
  run('git', submoduleArgs);
  // `git submodule add --force` stages .gitmodules and the submodule path. The
  // project's convention is that neither should be committed, so unstage them —
  // .gitmodules is gitignored and will disappear from git status, the submodule
  // path will reappear as an untracked directory.
  spawnSync('git', ['reset', 'HEAD', '--', '.gitmodules', submodulePath], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
  });
  info(`done. plugin available at ${submodulePath}`);
}

function cmdReset() {
  resetAllPlugins();
}

function findCurrentPlugin() {
  const existing = findExistingPluginPaths();
  if (existing.length === 0) {
    die(
      `no plugin submodule found under ${PLUGINS_DIR}/. run "yarn plugin get <name>" first.`
    );
  }
  if (existing.length > 1) {
    die(
      `expected exactly one plugin submodule, found:\n` +
        existing.map(p => `  - ${p}`).join('\n')
    );
  }
  return existing[0];
}

function readStoredAuth() {
  if (!fs.existsSync(AUTH_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

function writeStoredAuth(effective) {
  // Persist only fields that differ from the hard-coded defaults, so passing the
  // default value explicitly clears a previously-stored override.
  const overrides = {};
  for (const k of Object.keys(INSTALL_DEFAULTS)) {
    if (effective[k] !== INSTALL_DEFAULTS[k]) overrides[k] = effective[k];
  }
  if (Object.keys(overrides).length === 0) {
    if (fs.existsSync(AUTH_FILE)) fs.rmSync(AUTH_FILE, { force: true });
    return;
  }
  fs.writeFileSync(AUTH_FILE, JSON.stringify(overrides, null, 2) + '\n');
}

function cmdInstall(args) {
  const flags = {};
  let target = null; // null = both, 'frontend', or 'backend'
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--url') flags.url = args[++i];
    else if (a === '--username') flags.username = args[++i];
    else if (a === '--password') flags.password = args[++i];
    else if (a === 'frontend' || a === 'backend') {
      if (target) die(`install target already set to "${target}"`);
      target = a;
    } else die(`unknown argument for install: ${a}`);
  }

  // Precedence: CLI flag > stored override > hard-coded default.
  const stored = readStoredAuth();
  const effective = { ...INSTALL_DEFAULTS, ...stored, ...flags };
  writeStoredAuth(effective);

  const { url, username, password } = effective;

  const pluginPath = findCurrentPlugin();
  if (target && !fs.existsSync(path.join(REPO_ROOT, pluginPath, target))) {
    die(`expected ${pluginPath}/${target} directory, not found`);
  }

  // The rust CLI walks the input dir recursively, running yarn install and
  // yarn build-plugin for every package.json it finds, then bundles the dist
  // output. So no pre-build is needed here — just point it at the right level.
  const inputPath = target
    ? path.posix.join('..', pluginPath, target)
    : path.posix.join('..', pluginPath);

  info(`\n>>> generate-and-install-plugin-bundle (-i ${inputPath}) against ${url} as ${username}`);
  const cargoArgs = [
    'run',
    '--bin',
    'remote_server_cli',
    '--',
    'generate-and-install-plugin-bundle',
    '-i',
    inputPath,
    '--url',
    url,
    '--username',
    username,
    '--password',
    password,
  ];
  run('cargo', cargoArgs, { cwd: path.join(REPO_ROOT, 'server') });
  info('\ndone.');
}

function usage() {
  console.log(`usage:
  yarn plugin get <name> [-b <branch>]   add a plugin submodule (resets any existing first)
  yarn plugin install [frontend|backend] [--url U] [--username U] [--password P]
                                          build and install the current plugin into the local server
                                          (omit target to install both frontend and backend)
  yarn plugin reset                       remove all plugin submodules under ${PLUGINS_DIR}/`);
}

function main() {
  const [sub, ...rest] = process.argv.slice(2);
  switch (sub) {
    case 'get':
      return cmdGet(rest);
    case 'install':
      return cmdInstall(rest);
    case 'reset':
      return cmdReset();
    case undefined:
    case '-h':
    case '--help':
    case 'help':
      return usage();
    default:
      console.error(`unknown subcommand: ${sub}\n`);
      usage();
      process.exit(1);
  }
}

main();
