import { describe, expect, it } from 'vitest';
import {
  discoverDevPlugins,
  isOutsideRoot,
  parsePluginDirs,
  pluginProjectRoot,
  renderDevPluginsModule,
  type DevPluginFs,
} from './devPlugins.ts';

const ROOT = '/repo';

/** A fake disk: a map of path → contents (JSON files as objects). */
const fakeFs = (tree: Record<string, unknown>): DevPluginFs => ({
  readJson: file => tree[file],
  exists: file => file in tree,
});

const plugin = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  version: '1.0.0',
  omSupplyPlugin: { target: 'frontend', types: ['dashboard'] },
  ...extra,
});

describe('parsePluginDirs', () => {
  it('is empty for an unset or empty value', () => {
    expect(parsePluginDirs(undefined, ROOT)).toEqual([]);
    expect(parsePluginDirs('', ROOT)).toEqual([]);
    expect(parsePluginDirs(' : , ', ROOT)).toEqual([]);
  });

  it('accepts colon- and comma-separated entries', () => {
    expect(parsePluginDirs('/a:/b,/c', ROOT)).toEqual(['/a', '/b', '/c']);
  });

  it('resolves repo-relative entries against the root', () => {
    expect(parsePluginDirs('../civ-plugins/frontend/latest', ROOT)).toEqual([
      '/civ-plugins/frontend/latest',
    ]);
    expect(parsePluginDirs('examples/hello_world', ROOT)).toEqual([
      '/repo/examples/hello_world',
    ]);
  });

  it('de-duplicates paths that resolve to the same directory', () => {
    expect(parsePluginDirs('/a:/a/:/a/../a', ROOT)).toEqual(['/a']);
  });
});

describe('isOutsideRoot', () => {
  it('is false for the root and anything under it', () => {
    expect(isOutsideRoot(ROOT, ROOT)).toBe(false);
    expect(isOutsideRoot(ROOT, '/repo/examples/hello_world')).toBe(false);
  });

  it('is true for a sibling or unrelated directory (needs fs.allow)', () => {
    expect(isOutsideRoot(ROOT, '/civ-plugins/frontend/latest')).toBe(true);
    expect(isOutsideRoot(ROOT, '/elsewhere')).toBe(true);
  });
});

describe('pluginProjectRoot', () => {
  // What a real out-of-tree plugin looks like: the package is nested inside its
  // own repo, and imports a sibling module from the checkout root
  // (civ-plugins' `shared/` wire contract).
  const checkout = {
    '/civ-plugins/.git': '',
    '/civ-plugins/shared/constants.ts': '',
    '/civ-plugins/frontend/latest/package.json': plugin('civ_plugins'),
    '/civ-plugins/frontend/latest/src/plugin.ts': '',
  };

  it('is the plugin checkout, not the plugin package — its own imports must resolve', () => {
    expect(
      pluginProjectRoot('/civ-plugins/frontend/latest', fakeFs(checkout))
    ).toBe('/civ-plugins');
  });

  it('is the plugin directory itself when it is the repo root', () => {
    expect(
      pluginProjectRoot(
        '/solo',
        fakeFs({ '/solo/.git': '', '/solo/package.json': plugin('solo') })
      )
    ).toBe('/solo');
  });

  it('falls back to the directory when no repo encloses it', () => {
    expect(
      pluginProjectRoot(
        '/tmp/unpacked/plugin',
        fakeFs({ '/tmp/unpacked/plugin/package.json': plugin('loose') })
      )
    ).toBe('/tmp/unpacked/plugin');
  });
});

describe('discoverDevPlugins', () => {
  const examples = {
    '/repo/examples/hello_world/package.json': plugin('hello_world'),
    '/repo/examples/hello_world/plugin.tsx': '',
    '/repo/examples/api_too_new/package.json': plugin('api_too_new'),
    '/repo/examples/api_too_new/plugin.tsx': '',
  };

  it('loads NOTHING when OMS_PLUGIN_DIRS is unset — in-repo plugins are opt-in', () => {
    const { plugins, problems } = discoverDevPlugins(
      ROOT,
      undefined,
      fakeFs({
        ...examples,
        '/repo/plugins/civ/package.json': plugin('civ_plugins'),
        '/repo/plugins/civ/src/plugin.tsx': '',
      })
    );
    expect(plugins).toEqual([]);
    expect(problems).toEqual([]);
  });

  it('loads an in-repo plugin named by repo-relative path', () => {
    const { plugins, problems } = discoverDevPlugins(
      ROOT,
      'plugins/civ',
      fakeFs({
        ...examples,
        '/repo/plugins/civ/package.json': plugin('civ_plugins'),
        '/repo/plugins/civ/src/plugin.tsx': '',
      })
    );
    expect(problems).toEqual([]);
    // Only the named directory — the unnamed examples stay out.
    expect(plugins).toEqual([
      {
        code: 'civ_plugins',
        dir: '/repo/plugins/civ',
        entry: '/repo/plugins/civ/src/plugin.tsx',
      },
    ]);
  });

  it('prefers src/plugin.tsx only when no root entry exists', () => {
    const { plugins } = discoverDevPlugins(
      ROOT,
      '/civ/frontend/latest',
      fakeFs({
        '/civ/frontend/latest/package.json': plugin('civ_plugins'),
        '/civ/frontend/latest/src/plugin.tsx': '',
      })
    );
    expect(plugins).toEqual([
      {
        code: 'civ_plugins',
        dir: '/civ/frontend/latest',
        entry: '/civ/frontend/latest/src/plugin.tsx',
      },
    ]);
  });

  it('reports an explicitly named directory that cannot be used', () => {
    const { plugins, problems } = discoverDevPlugins(
      ROOT,
      '/nope:/half',
      fakeFs({ '/half/package.json': plugin('half') })
    );
    expect(plugins).toEqual([]);
    expect(problems).toEqual([
      '/nope: no readable package.json',
      '/half: no plugin entry (looked for plugin.tsx, plugin.ts, src/plugin.tsx, src/plugin.ts)',
    ]);
  });

  it('reports a directory whose package.json is not a frontend plugin', () => {
    const { problems } = discoverDevPlugins(
      ROOT,
      '/backend',
      fakeFs({
        '/backend/package.json': plugin('b', { omSupplyPlugin: undefined }),
        '/backend/plugin.tsx': '',
      })
    );
    expect(problems).toEqual([
      '/backend: package.json has no omSupplyPlugin.target "frontend"',
    ]);
  });

  it('lets a later entry override an earlier one of the same code', () => {
    const { plugins } = discoverDevPlugins(
      ROOT,
      'examples/hello_world:/work/hello_world',
      fakeFs({
        ...examples,
        '/work/hello_world/package.json': plugin('hello_world'),
        '/work/hello_world/plugin.tsx': '',
      })
    );
    expect(plugins.map(p => p.entry)).toEqual(['/work/hello_world/plugin.tsx']);
  });
});

describe('renderDevPluginsModule', () => {
  it('generates a lazy-import map keyed by plugin code', async () => {
    const source = renderDevPluginsModule([
      { code: 'hello_world', dir: '/repo/x', entry: '/repo/x/plugin.tsx' },
    ]);
    expect(source).toContain(
      '"hello_world": () => import("/repo/x/plugin.tsx"),'
    );
    // Dynamic, not static: one plugin's failure to evaluate must not take its
    // siblings down with it.
    expect(source).not.toContain('import "');
  });

  it('generates a valid empty map when nothing is discovered', () => {
    expect(renderDevPluginsModule([])).toContain('export const devPlugins = {');
  });
});
