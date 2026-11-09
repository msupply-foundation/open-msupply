/*
 * Plugin version check — a PR that changes what a plugin builds bumps it.
 *
 * A plugin's `version` is its release: publish-bundles.yaml publishes the
 * first build of a version and never a different build under it, warning
 * after the merge that the version wants bumping. This catches it before the
 * merge instead. For each in-repo plugin (pluginDirs.mjs), a change since the
 * base to anything that goes into its bundle needs a version above the
 * base's. Once per PR: a version already above the base is enough, however
 * many commits follow.
 *
 * What goes into the bundle is approximated by path: everything in the
 * plugin's directory except its docs and tests (`isBuilt`). A change that
 * moves the bytes from outside — the shared build preset, a dependency — is
 * not seen here; publish-bundles.mjs still warns about it after the merge.
 *
 * A plugin's version lives in each package.json that carries one: its
 * SolidJS half, a backend half, a React part's `latest`. Pinned React
 * snapshots (`react/frontend/1.0.0/`) are not current and are skipped.
 * build-plugins.mjs holds the halves to one version, so one of them moving
 * past the base is the bump.
 *
 *   node scripts/check-plugin-versions.mjs [--base <ref>] [--fix]
 *
 * --base   compared against the merge-base with this ref. By default, the
 *          one of origin/develop and origin/v*-RC this branch left most
 *          recently, so a branch off an RC is compared with that RC. CI
 *          passes HEAD^1: the PR's merge commit's first parent is the base it
 *          merges onto, so a base that has moved on — another PR released
 *          the same number — is compared against too.
 * --fix    bumps the patch of each plugin that needs it, in every current
 *          manifest and in an e2e helper's PLUGIN_VERSION pin.
 *
 * Compares the working tree, so it sees uncommitted changes too.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inRepoPluginDirs } from './pluginDirs.mjs';

const DOC_DIRS = new Set(['cases', 'decisions', 'test-env', '__tests__']);
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const PINNED = /^\d+\.\d+\.\d+$/;

/** Whether a file, by its path within the plugin, goes into the bundle. */
export const isBuilt = path => {
  const parts = path.split('/');
  const name = parts.at(-1);
  if (name.endsWith('.md') || TEST_FILE.test(name)) return false;
  return !parts.slice(0, -1).some(p => DOC_DIRS.has(p));
};

/** Whether a package.json, by its path in the plugin, holds its version. */
export const isCurrentManifest = path => {
  const parts = path.split('/');
  return (
    parts.at(-1) === 'package.json' &&
    !parts.some(p => p === 'node_modules' || PINNED.test(p))
  );
};

const segments = version => version.split('.').map(Number);

/** Whether `a` is a later version than `b`. */
export const isNewer = (a, b) => {
  const [x, y] = [segments(a), segments(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
};

/** The next patch, in the line's own width: 3.04.07 → 3.04.08. */
export const bumpPatch = version => {
  const parts = version.split('.');
  const last = parts.at(-1);
  parts[parts.length - 1] = String(Number(last) + 1).padStart(last.length, '0');
  return parts.join('.');
};

/**
 * The plugins that need a bump. Each plugin is { name, built, versions },
 * `built` its changed files that go into the bundle and `versions` each
 * current manifest's { path, base, head } (base undefined for one the base
 * didn't have). A plugin new since the base has nothing released to bump.
 */
export const needingBump = plugins =>
  plugins.filter(
    ({ built, versions }) =>
      built.length > 0 &&
      versions.some(v => v.base !== undefined) &&
      !versions.some(v => v.base !== undefined && isNewer(v.head, v.base))
  );

const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();

// Run from the repo root, so every path git prints is repo-relative.
const git = (...args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

const lines = text => (text ? text.split('\n') : []);

const versionOf = text => {
  try {
    return JSON.parse(text).version;
  } catch {
    return undefined;
  }
};

const atBase = (base, path) => {
  try {
    return git('show', `${base}:${path}`);
  } catch {
    return undefined;
  }
};

const readPlugins = base => {
  const changed = [
    ...lines(git('diff', '--name-only', base)),
    ...lines(git('ls-files', '--others', '--exclude-standard')),
  ];
  return inRepoPluginDirs().map(dir => {
    const pluginDir = relative(ROOT, resolve(dir));
    const within = path => relative(pluginDir, path);
    const files = lines(
      git('ls-files', '--cached', '--others', '--exclude-standard', pluginDir)
    );
    const versions = files
      .filter(p => isCurrentManifest(within(p)))
      .map(path => ({
        path,
        base: versionOf(atBase(base, path) ?? ''),
        head: versionOf(readFileSync(join(ROOT, path), 'utf8')),
      }))
      .filter(v => v.head !== undefined);
    const rootManifest = files.find(p => within(p) === 'package.json');
    return {
      name: pluginDir,
      code: rootManifest
        ? JSON.parse(readFileSync(join(ROOT, rootManifest), 'utf8')).name
        : undefined,
      built: changed.filter(
        p => p.startsWith(`${pluginDir}/`) && isBuilt(within(p))
      ),
      versions,
    };
  });
};

/** Of develop and the RC branches, the one this branch left most recently. */
const nearestBase = () => {
  const refs = lines(
    git(
      'for-each-ref',
      '--format=%(refname:short)',
      'refs/remotes/origin/develop',
      'refs/remotes/origin/v*-RC'
    )
  );
  const since = ref =>
    Number(
      git('rev-list', '--count', `${git('merge-base', ref, 'HEAD')}..HEAD`)
    );
  return refs.reduce((best, ref) => (since(ref) < since(best) ? ref : best));
};

/** Bump a plugin: every current manifest, and an e2e helper pinning it. */
const bump = plugin => {
  const bumped = [];
  for (const v of plugin.versions) {
    const path = join(ROOT, v.path);
    const next = bumpPatch(v.head);
    const text = readFileSync(path, 'utf8');
    writeFileSync(
      path,
      text.replace(`"version": "${v.head}"`, `"version": "${next}"`)
    );
    bumped.push(`${v.path} ${v.head} → ${next}`);
  }
  const helpers = join(ROOT, 'frontend/e2e/helpers');
  const pinned = plugin.code && existsSync(helpers);
  for (const name of pinned ? readdirSync(helpers) : []) {
    const path = join(helpers, name);
    const text = readFileSync(path, 'utf8');
    if (!text.includes(`PLUGIN_CODE = '${plugin.code}'`)) continue;
    for (const v of plugin.versions) {
      const pin = `PLUGIN_VERSION = '${v.head}'`;
      if (!text.includes(pin)) continue;
      writeFileSync(
        path,
        text.replace(pin, `PLUGIN_VERSION = '${bumpPatch(v.head)}'`)
      );
      bumped.push(
        `${relative(ROOT, path)} PLUGIN_VERSION → ${bumpPatch(v.head)}`
      );
      break;
    }
  }
  return bumped;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const ref = args.includes('--base')
    ? args[args.indexOf('--base') + 1]
    : nearestBase();
  const base = git('merge-base', ref, 'HEAD');
  const late = needingBump(readPlugins(base));
  if (late.length === 0) {
    console.log(
      `plugin versions OK — every changed plugin is bumped past ${ref}`
    );
    process.exit(0);
  }
  if (fix) {
    for (const plugin of late) {
      console.log(`${plugin.name}:\n  ${bump(plugin).join('\n  ')}`);
    }
    console.log('\nCommit it as "Bump the <plugin> plugin to <version>".');
    process.exit(0);
  }
  for (const plugin of late) {
    const shown = plugin.built.slice(0, 5).join(', ');
    const more =
      plugin.built.length > 5 ? `, +${plugin.built.length - 5} more` : '';
    const detail = `${plugin.name} changed (${shown}${more}) but its version is still the base's ${plugin.versions.find(v => v.base)?.base}`;
    console.error(
      process.env.GITHUB_ACTIONS ? `::error::${detail}` : `✗ ${detail}`
    );
  }
  console.error(
    `\nA plugin's version is its release; a changed build needs a new one, once per PR.\n` +
      `Fix: cd frontend && pnpm check:plugin-versions ${ref === 'HEAD^1' ? '' : `--base ${ref} `}--fix`
  );
  process.exit(1);
}
