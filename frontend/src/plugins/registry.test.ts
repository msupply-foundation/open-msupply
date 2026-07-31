import { beforeEach, describe, expect, it } from 'vitest';
import { PLUGIN_API_VERSION } from '../plugin-sdk/apiVersion';
import { definePlugin } from '../plugin-sdk/definePlugin';
import type { AnyContribution, PluginDefinition } from '../plugin-sdk/types';
import {
  clearPlugins,
  contributionsFor,
  loadedPlugins,
  registerPlugin,
  suppressedPieces,
} from './registry';

const Component = () => null;

const plugin = (
  code: string,
  extra: Omit<PluginDefinition, 'manifest'> = {}
) => ({
  code,
  module: definePlugin({
    manifest: { code, version: '1.0.0', pluginApiVersion: PLUGIN_API_VERSION },
    ...extra,
  }),
});

const stat = (
  id: string,
  order?: number,
  panel = 'replenishment.internal-order'
): AnyContribution => ({
  slot: 'dashboard.stat',
  id,
  panel,
  order,
  Component,
});

beforeEach(clearPlugins);

describe('registerPlugin', () => {
  it('collects loaded plugins', () => {
    registerPlugin(plugin('alpha'));
    registerPlugin(plugin('beta'));
    expect(loadedPlugins().map(p => p.code)).toEqual(['alpha', 'beta']);
  });

  it('replaces a re-registered code rather than duplicating it', () => {
    registerPlugin(plugin('alpha'));
    registerPlugin(plugin('alpha'));
    expect(loadedPlugins()).toHaveLength(1);
  });
});

describe('contributionsFor', () => {
  it('returns only the requested slot, tagged with the plugin code', () => {
    registerPlugin(
      plugin('alpha', {
        contributions: [
          stat('a'),
          { slot: 'dashboard.widget', id: 'w', Component },
        ],
      })
    );
    const stats = contributionsFor('dashboard.stat')();
    expect(stats).toHaveLength(1);
    expect(stats[0]?.id).toBe('a');
    expect(stats[0]?.pluginCode).toBe('alpha');
    expect(contributionsFor('dashboard.panel')()).toEqual([]);
  });

  it('orders by order, then plugin code, then id — independent of load order', () => {
    // Registered deliberately out of every sorting dimension.
    registerPlugin(
      plugin('zebra', { contributions: [stat('b'), stat('a'), stat('z', 1)] })
    );
    registerPlugin(
      plugin('alpha', { contributions: [stat('m'), stat('y', 1)] })
    );
    expect(
      contributionsFor('dashboard.stat')().map(c => `${c.pluginCode}.${c.id}`)
    ).toEqual([
      // order 1 first…
      'alpha.y',
      'zebra.z',
      // …then unset order (Infinity), by plugin code, then id.
      'alpha.m',
      'zebra.a',
      'zebra.b',
    ]);
  });

  it('is the same order whichever plugin registered first', () => {
    registerPlugin(plugin('alpha', { contributions: [stat('m')] }));
    registerPlugin(plugin('zebra', { contributions: [stat('a')] }));
    const forward = contributionsFor('dashboard.stat')().map(c => c.pluginCode);
    clearPlugins();
    registerPlugin(plugin('zebra', { contributions: [stat('a')] }));
    registerPlugin(plugin('alpha', { contributions: [stat('m')] }));
    expect(contributionsFor('dashboard.stat')().map(c => c.pluginCode)).toEqual(
      forward
    );
  });

  it('reads through to the registry, so a late plugin appears', () => {
    const stats = contributionsFor('dashboard.stat');
    expect(stats()).toEqual([]);
    registerPlugin(plugin('alpha', { contributions: [stat('a')] }));
    expect(stats()).toHaveLength(1);
  });

  it('carries the contribution`s own when gate through untouched', () => {
    // The registry does not evaluate `when` — the slot does, at render time, so
    // a gate can read a context that has not resolved yet.
    const when = () => false;
    registerPlugin(
      plugin('alpha', { contributions: [{ ...stat('a'), when }] })
    );
    expect(contributionsFor('dashboard.stat')()[0]?.when).toBe(when);
  });
});

describe('suppressedPieces', () => {
  it('is empty with no plugins', () => {
    expect(suppressedPieces().size).toBe(0);
  });

  it('unions the suppression lists of every loaded plugin', () => {
    registerPlugin(plugin('alpha', { suppress: ['replenishment.inbound'] }));
    registerPlugin(
      plugin('beta', {
        suppress: ['replenishment.inbound', 'inventory.stock-levels.at-risk'],
      })
    );
    expect([...suppressedPieces()].sort()).toEqual([
      'inventory.stock-levels.at-risk',
      'replenishment.inbound',
    ]);
  });

  it('drops with the plugin that asked for it', () => {
    registerPlugin(plugin('alpha', { suppress: ['replenishment.inbound'] }));
    clearPlugins();
    expect(suppressedPieces().size).toBe(0);
  });
});
