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
const AUTH_FILE = path.join(REPO_ROOT, MAP_DIR, 'pluginAuth.json');
const GITMODULES = path.join(REPO_ROOT, '.gitmodules');

function gitLocalExcludePath() {
  // Ask git directly so this works with worktrees/submodules where `.git` is a
  // file pointing elsewhere, not a directory.
  try {
    const out = execFileSync('git', ['rev-parse', '--git-path', 'info/exclude'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
    return path.isAbsolute(out) ? out : path.join(REPO_ROOT, out);
  } catch {
    return null;
  }
}

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

function addLocalExclude(submodulePath) {
  // info/exclude is git's per-clone ignore list — never committed, never appears
  // in diffs. Hides the submodule directory from `git status` without touching
  // the tracked .gitignore.
  const excludePath = gitLocalExcludePath();
  if (!excludePath) return;
  const entry = submodulePath.split(path.sep).join('/');
  let lines = [];
  if (fs.existsSync(excludePath)) {
    lines = fs.readFileSync(excludePath, 'utf8').split('\n');
  }
  if (lines.some(l => l.trim() === entry)) return;
  lines.push(entry);
  fs.mkdirSync(path.dirname(excludePath), { recursive: true });
  fs.writeFileSync(excludePath, lines.join('\n'));
}

function removeLocalExclude(submodulePath) {
  const excludePath = gitLocalExcludePath();
  if (!excludePath || !fs.existsSync(excludePath)) return;
  const entry = submodulePath.split(path.sep).join('/');
  const lines = fs.readFileSync(excludePath, 'utf8').split('\n');
  const filtered = lines.filter(l => l.trim() !== entry);
  if (filtered.length !== lines.length) {
    fs.writeFileSync(excludePath, filtered.join('\n'));
  }
}

function pruneGitmodulesEntry(submodulePath) {
  if (!fs.existsSync(GITMODULES)) return;
  const normalized = submodulePath.split(path.sep).join('/');
  spawnSync(
    'git',
    ['config', '-f', GITMODULES, '--remove-section', `submodule.${normalized}`],
    { cwd: REPO_ROOT, stdio: 'ignore' }
  );
  // Drop the file entirely once no submodule sections remain.
  const content = fs.readFileSync(GITMODULES, 'utf8');
  if (!/\[submodule\b/.test(content)) {
    fs.rmSync(GITMODULES, { force: true });
  }
}

function removeSubmodule(submodulePath) {
  info(`removing submodule ${submodulePath}`);
  removeLocalExclude(submodulePath);
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
  pruneGitmodulesEntry(submodulePath);
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
  if (!fs.existsSync(MAP_FILE)) return {};
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
    die('usage: yarn plugin get <name|url> [-b <branch>]');
  }
  const nameOrUrl = positional[0];
  const map = readMap();
  // Look up in the map first; if there's no match, treat the argument as a
  // direct repo URL/spec and let git tell us if it's invalid.
  const url = map[nameOrUrl] || nameOrUrl;

  const folder = folderNameFromUrl(url);
  const submodulePath = path.posix.join(
    'client',
    'packages',
    'plugins',
    folder
  );

  // If this exact plugin folder already exists, replace it (other plugins
  // are left alone). Abort if the existing one has uncommitted changes.
  if (fs.existsSync(path.join(REPO_ROOT, submodulePath))) {
    if (isSubmoduleDirty(submodulePath)) {
      die(
        `${submodulePath} has uncommitted changes; commit or stash inside the submodule, then re-run.`
      );
    }
    info(`replacing existing ${submodulePath}`);
    removeSubmodule(submodulePath);
  }
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
  // .gitmodules is gitignored and disappears from git status, and the submodule
  // path is added to .git/info/exclude below so it doesn't appear as untracked.
  spawnSync('git', ['reset', 'HEAD', '--', '.gitmodules', submodulePath], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
  });
  addLocalExclude(submodulePath);
  info(`done. plugin available at ${submodulePath}`);
}

function cmdReset(args) {
  if (args.length === 0) {
    resetAllPlugins();
    return;
  }
  if (args.length > 1) die('usage: yarn plugin reset [<selector>]');
  const submodulePath = findPluginPathBySelector(args[0]);
  if (isSubmoduleDirty(submodulePath)) {
    die(
      `${submodulePath} has uncommitted changes; commit or stash inside the submodule, then re-run.`
    );
  }
  removeSubmodule(submodulePath);
}

function dieNoPlugins() {
  die(
    `no plugin submodule found under ${PLUGINS_DIR}/. run "yarn plugin get <name>" first.`
  );
}

function dieAmbiguous(installed, action) {
  die(
    `multiple plugins installed; specify which one to ${action}:\n` +
      installed.map(p => `  - ${path.basename(p)}`).join('\n')
  );
}

function findPluginPathBySelector(selector) {
  // Resolve a name/folder/map-key to an installed submodule path. Match against
  // folder basenames first; if not found, look up in the map and try the URL's
  // basename. Used by commands that operate on a single specific plugin.
  const installed = findExistingPluginPaths();
  if (installed.length === 0) dieNoPlugins();
  const byFolder = new Map(installed.map(p => [path.basename(p), p]));
  if (byFolder.has(selector)) return byFolder.get(selector);
  const mapped = readMap()[selector];
  if (mapped) {
    const folder = folderNameFromUrl(mapped);
    if (byFolder.has(folder)) return byFolder.get(folder);
  }
  die(
    `no installed plugin matches "${selector}". installed: ${
      [...byFolder.keys()].join(', ') || '(none)'
    }`
  );
}

function findSinglePluginPath(action) {
  const installed = findExistingPluginPaths();
  if (installed.length === 0) dieNoPlugins();
  if (installed.length > 1) dieAmbiguous(installed, action);
  return installed[0];
}

function readStoredAuth() {
  if (!fs.existsSync(AUTH_FILE)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function resolveAuth(map, profileName, flags) {
  // Per-field precedence: CLI flag > named profile > _default profile > hardcoded.
  const def = map._default || {};
  const named = profileName ? map[profileName] || {} : {};
  return { ...INSTALL_DEFAULTS, ...def, ...named, ...flags };
}

function writeStoredAuth(map, profileName, flags) {
  // Only flag values get written; fallback values stay where they came from. No
  // filtering against hardcoded defaults — passing the default value pins it.
  if (Object.keys(flags).length === 0) return;
  const active = profileName || '_default';
  const next = {
    ...map,
    [active]: { ...(map[active] || {}), ...flags },
  };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(next, null, 2) + '\n');
}

function cmdInstall(args) {
  const flags = {};
  let target = null; // null = both, 'frontend', or 'backend'
  let selector = null;
  let profileName = null;
  // Accept both `--flag value` and `--flag=value` for every named flag.
  const eqMatch = a => {
    const eq = a.indexOf('=');
    return eq > 0 ? [a.slice(0, eq), a.slice(eq + 1)] : null;
  };
  for (let i = 0; i < args.length; i++) {
    let a = args[i];
    let inlineValue = null;
    const m = eqMatch(a);
    if (m) {
      a = m[0];
      inlineValue = m[1];
    }
    const next = () => (inlineValue !== null ? inlineValue : args[++i]);
    if (a === '--url') flags.url = next();
    else if (a === '--username') flags.username = next();
    else if (a === '--password') flags.password = next();
    else if (a === '--auth') profileName = next();
    else if (a === 'frontend' || a === 'backend') {
      if (target) die(`install target already set to "${target}"`);
      target = a;
    } else if (!selector) {
      selector = a;
    } else die(`unknown argument for install: ${a}`);
  }

  if (profileName === '_default') {
    die('"_default" is the implicit fallback profile and cannot be named explicitly');
  }
  if (profileName === '') {
    die('--auth requires a profile name');
  }

  const map = readStoredAuth();
  if (profileName && !map[profileName]) {
    info(`>>> creating new auth profile "${profileName}"`);
  }
  const effective = resolveAuth(map, profileName, flags);
  writeStoredAuth(map, profileName, flags);

  const { url, username, password } = effective;

  const pluginPaths = selector
    ? [findPluginPathBySelector(selector)]
    : findExistingPluginPaths();
  if (pluginPaths.length === 0) dieNoPlugins();

  for (const pluginPath of pluginPaths) {
    if (target && !fs.existsSync(path.join(REPO_ROOT, pluginPath, target))) {
      die(`expected ${pluginPath}/${target} directory, not found`);
    }

    // The rust CLI walks the input dir recursively, running yarn install and
    // yarn build-plugin for every package.json it finds, then bundles the dist
    // output. So no pre-build is needed here — just point it at the right level.
    const inputPath = target
      ? path.posix.join('..', pluginPath, target)
      : path.posix.join('..', pluginPath);

    const profileSuffix = profileName ? ` (profile: ${profileName})` : '';
    info(
      `\n>>> generate-and-install-plugin-bundle (-i ${inputPath}) against ${url} as ${username}${profileSuffix}`
    );
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
  }
  info('\ndone.');
}

function promptYesNo(question) {
  const readline = require('readline');
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, answer => {
      rl.close();
      const a = answer.trim().toLowerCase();
      resolve(a === 'y' || a === 'yes');
    });
  });
}

async function cmdUninstall(args) {
  const flags = {};
  let selectorCode = null;
  let kindFilter = null; // null | 'frontend' | 'backend'
  let profileName = null;
  let allFlag = false;

  const eqMatch = a => {
    const eq = a.indexOf('=');
    return eq > 0 ? [a.slice(0, eq), a.slice(eq + 1)] : null;
  };
  for (let i = 0; i < args.length; i++) {
    let a = args[i];
    let inlineValue = null;
    const m = eqMatch(a);
    if (m) {
      a = m[0];
      inlineValue = m[1];
    }
    const next = () => (inlineValue !== null ? inlineValue : args[++i]);
    if (a === '--url') flags.url = next();
    else if (a === '--username') flags.username = next();
    else if (a === '--password') flags.password = next();
    else if (a === '--auth') profileName = next();
    else if (a === '--all') allFlag = true;
    else if (a === 'frontend' || a === 'backend') {
      if (kindFilter) die(`uninstall kind already set to "${kindFilter}"`);
      kindFilter = a;
    } else if (!selectorCode && !a.startsWith('-')) {
      selectorCode = a;
    } else die(`unknown argument for uninstall: ${a}`);
  }

  if (allFlag && (selectorCode || kindFilter)) {
    die('--all cannot be combined with a code/kind selector');
  }
  if (!allFlag && !selectorCode) {
    die(
      'usage: yarn plugin uninstall <code> [frontend|backend]  OR  yarn plugin uninstall --all'
    );
  }
  if (profileName === '_default') {
    die(
      '"_default" is the implicit fallback profile and cannot be named explicitly'
    );
  }
  if (profileName === '') die('--auth requires a profile name');

  const map = readStoredAuth();
  if (profileName && !map[profileName]) {
    info(`>>> creating new auth profile "${profileName}"`);
  }
  const effective = resolveAuth(map, profileName, flags);
  writeStoredAuth(map, profileName, flags);
  const { url, username, password } = effective;

  // Discover installed plugins via the rust CLI's list-installed-plugins
  // subcommand, which prints the nodes array as JSON on stdout.
  info(`\n>>> list-installed-plugins against ${url} as ${username}`);
  const listJson = runCapture(
    'cargo',
    [
      'run',
      '-q',
      '--bin',
      'remote_server_cli',
      '--',
      'list-installed-plugins',
      '--url',
      url,
      '--username',
      username,
      '--password',
      password,
    ],
    { cwd: path.join(REPO_ROOT, 'server') }
  );

  let installed;
  try {
    installed = JSON.parse(listJson);
  } catch (e) {
    die(
      `could not parse installedPlugins JSON: ${e.message}\n--- output ---\n${listJson}`
    );
  }
  if (!Array.isArray(installed)) {
    die(`unexpected installedPlugins payload: ${JSON.stringify(installed)}`);
  }

  let toUninstall;
  if (allFlag) {
    toUninstall = installed;
  } else {
    const kindFilterUpper = kindFilter ? kindFilter.toUpperCase() : null;
    toUninstall = installed.filter(
      p =>
        p.code === selectorCode &&
        (!kindFilterUpper || p.kind === kindFilterUpper)
    );
  }

  if (toUninstall.length === 0) {
    info(
      allFlag
        ? 'no installed plugins to uninstall.'
        : `no installed plugin matches code "${selectorCode}"${
            kindFilter ? ` (kind ${kindFilter})` : ''
          }.`
    );
    return;
  }

  info(`\nWill uninstall ${toUninstall.length} plugin row(s):`);
  for (const p of toUninstall) {
    info(
      `  - ${p.code} ${p.version} (${p.kind.toLowerCase()})  [id: ${p.id}]`
    );
  }

  if (allFlag) {
    const ok = await promptYesNo(`\nContinue? [y/N] `);
    if (!ok) {
      info('aborted.');
      return;
    }
  }

  for (const p of toUninstall) {
    info(`\n>>> uninstall-plugin --id ${p.id}`);
    run(
      'cargo',
      [
        'run',
        '-q',
        '--bin',
        'remote_server_cli',
        '--',
        'uninstall-plugin',
        '--id',
        p.id,
        '--url',
        url,
        '--username',
        username,
        '--password',
        password,
      ],
      { cwd: path.join(REPO_ROOT, 'server') }
    );
  }

  info('\ndone.');
}

function cmdOpen(args) {
  if (args.length > 1) die('usage: yarn plugin open [<selector>]');
  const pluginPath = args[0]
    ? findPluginPathBySelector(args[0])
    : findSinglePluginPath('open');
  const full = path.join(REPO_ROOT, pluginPath);
  info(`opening ${pluginPath} in GitHub Desktop`);
  if (process.platform === 'darwin') {
    run('open', ['-a', 'GitHub Desktop', full]);
  } else if (process.platform === 'win32') {
    run('cmd', ['/c', 'start', '', 'github://openLocalRepo/' + encodeURI(full)]);
  } else {
    run('github', [full]);
  }
}

function cmdList() {
  const installed = findExistingPluginPaths();
  if (installed.length === 0) {
    info('no plugin submodules installed');
    return;
  }
  for (const p of installed) info(`${path.basename(p)}  (${p})`);
}

function usage() {
  console.log(`usage:
  yarn plugin get <name|url> [-b <branch>]
                                          add a plugin submodule (replaces it if already present).
                                          <name> is looked up in pluginRepoMap.json;
                                          anything else is used directly as a repo URL.
                                          Other installed plugins are left alone.
  yarn plugin install [<selector>] [frontend|backend]
                      [--auth <profile>] [--url U] [--username U] [--password P]
                                          build and install plugins into the local server.
                                          With no selector, installs every plugin in turn.
                                          Pass frontend or backend to limit to one half.
                                          --auth picks an auth profile from pluginAuth.json
                                          (auto-created if it doesn't exist yet).
  yarn plugin uninstall <code> [frontend|backend]
                      [--auth <profile>] [--url U] [--username U] [--password P]
                                          uninstall plugins from the server by their code.
                                          Pass frontend or backend to limit to one half.
                                          Leaves the local submodule alone (use reset for that).
  yarn plugin uninstall --all
                      [--auth <profile>] [--url U] [--username U] [--password P]
                                          uninstall every plugin currently on the server
                                          (prompts before deleting).
  yarn plugin open [<selector>]           open the plugin submodule in GitHub Desktop.
                                          Selector required if more than one plugin is installed.
  yarn plugin list                        list installed plugin submodules.
  yarn plugin reset [<selector>]          remove all plugin submodules, or just the named one.`);
}

function main() {
  const [sub, ...rest] = process.argv.slice(2);
  switch (sub) {
    case 'get':
      return cmdGet(rest);
    case 'install':
      return cmdInstall(rest);
    case 'uninstall':
      return cmdUninstall(rest);
    case 'open':
      return cmdOpen(rest);
    case 'list':
    case 'ls':
      return cmdList();
    case 'reset':
      return cmdReset(rest);
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

Promise.resolve(main()).catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
