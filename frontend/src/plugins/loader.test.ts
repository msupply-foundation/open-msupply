import { describe, expect, it, vi } from 'vitest';
import { PLUGIN_API_VERSION } from '../plugin-sdk/apiVersion';
import { definePlugin } from '../plugin-sdk/definePlugin';
import type { PluginDiagnostic } from './diagnostics';
import {
  loadPlugins,
  type LoadPluginsDeps,
  type PluginMetadataEntry,
} from './loader';
import type { LoadedPlugin } from './registry';

const Component = () => null;

const bundle = (code: string, pluginApiVersion = PLUGIN_API_VERSION) => ({
  default: definePlugin({
    manifest: { code, version: '1.0.0', pluginApiVersion },
    translations: { en: { greeting: `hello from ${code}` } },
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

const entry = (code: string): PluginMetadataEntry => ({
  code,
  path: `${code}/${code}.js`,
  hash: `hash-${code}`,
});

// A recording harness: every effect the loader performs is a dependency, so the
// pipeline runs in node with no network, no DOM, and no real bundle.
const harness = (
  overrides: Partial<LoadPluginsDeps> = {}
): {
  deps: LoadPluginsDeps;
  registered: LoadedPlugin[];
  diagnostics: PluginDiagnostic[];
  translations: string[];
  imported: string[];
} => {
  const registered: LoadedPlugin[] = [];
  const diagnostics: PluginDiagnostic[] = [];
  const translations: string[] = [];
  const imported: string[] = [];
  const deps: LoadPluginsDeps = {
    fetchMetadata: () => Promise.resolve([]),
    importBundle: url => {
      imported.push(url);
      return Promise.resolve({});
    },
    registerTranslations: code => translations.push(code),
    register: plugin => registered.push(plugin),
    recordDiagnostic: diagnostic => diagnostics.push(diagnostic),
    ...overrides,
  };
  return { deps, registered, diagnostics, translations, imported };
};

describe('loadPlugins', () => {
  it('fetches each discovered bundle at its hashed URL and registers it', async () => {
    const imported: string[] = [];
    const { deps, registered } = harness({
      fetchMetadata: () => Promise.resolve([entry('hello_world')]),
      importBundle: url => {
        imported.push(url);
        return Promise.resolve(bundle('hello_world'));
      },
    });
    await loadPlugins(deps);
    expect(imported).toEqual([
      '/frontend_plugins/hello_world/hello_world.js?v=hash-hello_world',
    ]);
    expect(registered.map(p => p.code)).toEqual(['hello_world']);
  });

  it('registers translations BEFORE the contributions become readable', async () => {
    // Otherwise a contribution can render in the same tick its catalogue has
    // not arrived, flashing its raw namespaced keys.
    const order: string[] = [];
    const { deps } = harness({
      fetchMetadata: () => Promise.resolve([entry('demo')]),
      importBundle: () => Promise.resolve(bundle('demo')),
      registerTranslations: () => order.push('translations'),
      register: () => order.push('register'),
    });
    await loadPlugins(deps);
    expect(order).toEqual(['translations', 'register']);
  });

  it('continues with no plugins when discovery fails (AC-PLUG-L3)', async () => {
    const { deps, registered, diagnostics } = harness({
      fetchMetadata: () => Promise.resolve(undefined),
    });
    await expect(loadPlugins(deps)).resolves.toBeUndefined();
    expect(registered).toEqual([]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toContain('discovery failed');
  });

  it('continues when discovery throws outright', async () => {
    const { deps, diagnostics } = harness({
      fetchMetadata: () => Promise.reject(new Error('offline')),
    });
    await expect(loadPlugins(deps)).resolves.toBeUndefined();
    expect(diagnostics.map(d => d.message)).toEqual([
      'plugin discovery threw: offline',
      'plugin discovery failed — continuing without plugins',
    ]);
  });

  it('registers a sibling when one bundle fails to import', async () => {
    const { deps, registered, diagnostics } = harness({
      fetchMetadata: () => Promise.resolve([entry('broken'), entry('working')]),
      importBundle: url =>
        url.includes('broken')
          ? Promise.reject(new Error('404'))
          : Promise.resolve(bundle('working')),
    });
    await loadPlugins(deps);
    expect(registered.map(p => p.code)).toEqual(['working']);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      level: 'error',
      pluginCode: 'broken',
    });
    expect(diagnostics[0]?.message).toContain('404');
  });

  it('names a refused plugin and loads its sibling (AC-PLUG-V1)', async () => {
    const { deps, registered, diagnostics } = harness({
      fetchMetadata: () =>
        Promise.resolve([entry('api_too_new'), entry('hello_world')]),
      importBundle: url =>
        Promise.resolve(
          url.includes('api_too_new')
            ? bundle('api_too_new', 999)
            : bundle('hello_world')
        ),
    });
    await loadPlugins(deps);
    expect(registered.map(p => p.code)).toEqual(['hello_world']);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.pluginCode).toBe('api_too_new');
    expect(diagnostics[0]?.message).toContain('999');
  });

  it('does not register a plugin whose translations throw', async () => {
    const { deps, registered, diagnostics } = harness({
      fetchMetadata: () => Promise.resolve([entry('demo')]),
      importBundle: () => Promise.resolve(bundle('demo')),
      registerTranslations: () => {
        throw new Error('catalogue is not a map');
      },
    });
    await loadPlugins(deps);
    expect(registered).toEqual([]);
    expect(diagnostics[0]?.message).toContain(
      'translations could not be registered'
    );
  });

  it('contains a registration failure to the one plugin', async () => {
    const register = vi.fn((plugin: LoadedPlugin) => {
      if (plugin.code === 'broken') throw new Error('registry exploded');
    });
    const { deps, diagnostics } = harness({
      fetchMetadata: () => Promise.resolve([entry('broken'), entry('working')]),
      importBundle: url =>
        Promise.resolve(bundle(url.includes('broken') ? 'broken' : 'working')),
      register,
    });
    await expect(loadPlugins(deps)).resolves.toBeUndefined();
    expect(register).toHaveBeenCalledTimes(2);
    expect(diagnostics[0]?.message).toContain('registration failed');
  });

  it('loads every plugin even when the first one hangs longest', async () => {
    // allSettled, not a sequential await: a slow bundle must not gate a fast
    // one.
    const { deps, registered } = harness({
      fetchMetadata: () => Promise.resolve([entry('slow'), entry('fast')]),
      importBundle: url =>
        url.includes('slow')
          ? new Promise(resolve =>
              setTimeout(() => resolve(bundle('slow')), 10)
            )
          : Promise.resolve(bundle('fast')),
    });
    await loadPlugins(deps);
    expect(registered.map(p => p.code).sort()).toEqual(['fast', 'slow']);
  });
});
