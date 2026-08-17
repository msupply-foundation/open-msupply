import { describe, expect, it } from 'vitest';
import { PLUGIN_API_VERSION } from '../plugin-sdk/apiVersion';
import { definePlugin } from '../plugin-sdk/definePlugin';
import type { PluginDiagnostic } from './diagnostics';
import {
  loadDevPlugins,
  parseDevPluginOverrides,
  type DevPluginDeps,
} from './devPlugins';
import type { LoadedPlugin } from './registry';

const Component = () => null;

const bundle = (code: string, pluginApiVersion = PLUGIN_API_VERSION) => ({
  default: definePlugin({
    manifest: { code, version: '1.0.0', pluginApiVersion },
    contributions: [
      {
        slot: 'dashboard.stat',
        id: 'greeting',
        panel: 'replenishment.internal-order',
        Component,
      },
    ],
  }),
});

/**
 * A source-mode map. Built from entries rather than an object literal because
 * its keys are plugin codes — lower_snake_case, which as identifiers would trip
 * the repo's camelcase rule.
 */
const sources = (
  entries: readonly (readonly [string, () => Promise<unknown>])[]
): Record<string, () => Promise<unknown>> => Object.fromEntries(entries);

const harness = (
  overrides: Partial<DevPluginDeps> = {}
): {
  deps: DevPluginDeps;
  registered: LoadedPlugin[];
  diagnostics: PluginDiagnostic[];
  imported: string[];
} => {
  const registered: LoadedPlugin[] = [];
  const diagnostics: PluginDiagnostic[] = [];
  const imported: string[] = [];
  const deps: DevPluginDeps = {
    importSources: () => Promise.resolve({}),
    importBundle: url => {
      imported.push(url);
      return Promise.resolve({});
    },
    search: '',
    registeredCodes: () => registered.map(plugin => plugin.code),
    registerTranslations: () => {},
    register: plugin => {
      const at = registered.findIndex(
        existing => existing.code === plugin.code
      );
      if (at === -1) registered.push(plugin);
      else registered[at] = plugin; // registerPlugin replaces by code
    },
    recordDiagnostic: diagnostic => diagnostics.push(diagnostic),
    ...overrides,
  };
  return { deps, registered, diagnostics, imported };
};

describe('parseDevPluginOverrides', () => {
  it('is empty for no query string', () => {
    expect(parseDevPluginOverrides('')).toEqual({
      overrides: [],
      problems: [],
    });
    expect(parseDevPluginOverrides('?store=abc').overrides).toEqual([]);
  });

  it('parses one code@url', () => {
    expect(
      parseDevPluginOverrides(
        '?devPlugin=civ_plugins@http://localhost:4173/x.js'
      ).overrides
    ).toEqual([{ code: 'civ_plugins', url: 'http://localhost:4173/x.js' }]);
  });

  it('parses several, comma-separated and repeated', () => {
    const { overrides } = parseDevPluginOverrides(
      '?devPlugin=a@http://a/a.js,b@http://b/b.js&devPlugin=c@http://c/c.js'
    );
    expect(overrides.map(o => o.code)).toEqual(['a', 'b', 'c']);
    expect(overrides.map(o => o.url)).toEqual([
      'http://a/a.js',
      'http://b/b.js',
      'http://c/c.js',
    ]);
  });

  it('ignores surrounding whitespace and empty entries', () => {
    const { overrides, problems } = parseDevPluginOverrides(
      '?devPlugin= a@http://a/a.js , ,b@http://b/b.js '
    );
    expect(overrides).toEqual([
      { code: 'a', url: 'http://a/a.js' },
      { code: 'b', url: 'http://b/b.js' },
    ]);
    expect(problems).toEqual([]);
  });

  it('splits at the FIRST @, so the URL may contain one', () => {
    expect(
      parseDevPluginOverrides('?devPlugin=a@http://user@host:4173/a.js')
        .overrides
    ).toEqual([{ code: 'a', url: 'http://user@host:4173/a.js' }]);
  });

  it('reports a value with no @, no code, or no url', () => {
    const { overrides, problems } = parseDevPluginOverrides(
      '?devPlugin=nourl&devPlugin=@http://a/a.js&devPlugin=b@'
    );
    expect(overrides).toEqual([]);
    expect(problems).toHaveLength(3);
    expect(problems[0]).toContain('"nourl"');
    expect(problems.every(p => p.includes('code@url'))).toBe(true);
  });

  it('lets the last entry for a code win', () => {
    expect(
      parseDevPluginOverrides('?devPlugin=a@http://one/a.js,a@http://two/a.js')
        .overrides
    ).toEqual([{ code: 'a', url: 'http://two/a.js' }]);
  });
});

describe('loadDevPlugins', () => {
  it('registers every source-mode plugin under its map key', async () => {
    const { deps, registered, diagnostics } = harness({
      importSources: () =>
        Promise.resolve(
          sources([
            ['hello_world', () => Promise.resolve(bundle('hello_world'))],
            ['civ_plugins', () => Promise.resolve(bundle('civ_plugins'))],
          ])
        ),
    });
    await loadDevPlugins(deps);
    expect(registered.map(p => p.code)).toEqual(['hello_world', 'civ_plugins']);
    expect(diagnostics.map(d => d.message)).toEqual([
      'dev plugin loaded from source',
      'dev plugin loaded from source',
    ]);
  });

  it('refuses a source plugin the installed pipeline would refuse', async () => {
    // The same validate gate, no exemptions: a manifest code that does not
    // match its key, and an API version newer than the host.
    const { deps, registered, diagnostics } = harness({
      importSources: () =>
        Promise.resolve(
          sources([
            ['renamed', () => Promise.resolve(bundle('something_else'))],
            ['api_too_new', () => Promise.resolve(bundle('api_too_new', 999))],
            ['fine', () => Promise.resolve(bundle('fine'))],
          ])
        ),
    });
    await loadDevPlugins(deps);
    expect(registered.map(p => p.code)).toEqual(['fine']);
    expect(diagnostics[0]?.message).toContain('does not match');
    expect(diagnostics[1]?.message).toContain('999');
  });

  it('contains a source plugin that fails to evaluate', async () => {
    const { deps, registered, diagnostics } = harness({
      importSources: () =>
        Promise.resolve({
          broken: () => Promise.reject(new Error('syntax error')),
          working: () => Promise.resolve(bundle('working')),
        }),
    });
    await expect(loadDevPlugins(deps)).resolves.toBeUndefined();
    expect(registered.map(p => p.code)).toEqual(['working']);
    expect(diagnostics[0]?.message).toBe(
      'dev plugin failed to load from source: syntax error'
    );
  });

  it('continues when the generated source map is unavailable', async () => {
    const { deps, diagnostics } = harness({
      importSources: () => Promise.reject(new Error('no vite plugin')),
      search: '?devPlugin=a@http://a/a.js',
      importBundle: () => Promise.resolve(bundle('a')),
    });
    await loadDevPlugins(deps);
    expect(diagnostics[0]?.message).toContain('sources unavailable');
    // …and the ?devPlugin= half still runs.
    expect(diagnostics.at(-1)?.message).toBe(
      'dev plugin loaded from http://a/a.js'
    );
  });

  it('imports a ?devPlugin= bundle from its own URL', async () => {
    const imported: string[] = [];
    const { deps, registered } = harness({
      search: '?devPlugin=civ_plugins@http://localhost:4173/civ_plugins.js',
      importBundle: url => {
        imported.push(url);
        return Promise.resolve(bundle('civ_plugins'));
      },
    });
    await loadDevPlugins(deps);
    expect(imported).toEqual(['http://localhost:4173/civ_plugins.js']);
    expect(registered.map(p => p.code)).toEqual(['civ_plugins']);
  });

  it('names the plugin it replaces (the point of the override)', async () => {
    const { deps, registered, diagnostics } = harness({
      search: '?devPlugin=civ_plugins@http://localhost:4173/civ_plugins.js',
      importBundle: () => Promise.resolve(bundle('civ_plugins')),
    });
    // As if the installed set had already registered it.
    deps.register({
      code: 'civ_plugins',
      module: bundle('civ_plugins').default,
    });
    await loadDevPlugins(deps);
    expect(registered).toHaveLength(1);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      level: 'info',
      pluginCode: 'civ_plugins',
    });
    expect(diagnostics[0]?.message).toContain(
      'REPLACES the plugin already registered under this code'
    );
  });

  it('lets a ?devPlugin= bundle override a source plugin of the same code', async () => {
    const { deps, diagnostics } = harness({
      importSources: () =>
        Promise.resolve({ a: () => Promise.resolve(bundle('a')) }),
      search: '?devPlugin=a@http://a/a.js',
      importBundle: () => Promise.resolve(bundle('a')),
    });
    await loadDevPlugins(deps);
    expect(diagnostics.map(d => d.message)).toEqual([
      'dev plugin loaded from source',
      'dev override loaded from http://a/a.js — REPLACES the plugin already registered under this code',
    ]);
  });

  it('reports a malformed ?devPlugin value without loading anything', async () => {
    const { deps, imported, diagnostics } = harness({
      search: '?devPlugin=oops',
    });
    await loadDevPlugins(deps);
    expect(imported).toEqual([]);
    expect(diagnostics).toEqual([
      {
        level: 'warning',
        message:
          'ignored malformed ?devPlugin value "oops" — expected code@url',
      },
    ]);
  });
});
