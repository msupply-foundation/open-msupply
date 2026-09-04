import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PluginPageSection, SlotContext } from '../plugin-sdk/types';

/*
 * The pages contribution's host machinery (spec/plugins/rules.md § pages &
 * navigation; AC-PLUG-P1/P2; the mechanism behind OMS-REG-PLG-CK-02.1/.2).
 *
 * The slot context is the one mocked edge: these tests drive the session facts
 * (store mode, permissions) directly, and everything between them and the
 * verdicts — the registry, the collision resolution, the two gate classes —
 * runs for real.
 */

const ctx = vi.hoisted(() => ({
  current: {
    storeId: 'store-a',
    permissions: [],
    storeMode: undefined,
    storePreferences: {
      useConsumptionAndStockFromCustomersForInternalOrders: false,
      monthsUnderstock: undefined,
    },
  } as SlotContext,
}));

vi.mock('./slotContext', () => ({ slotContext: () => ctx.current }));

import { definePlugin } from '../plugin-sdk/definePlugin';
import { pluginDiagnostics } from './diagnostics';
import { clearPlugins, registerPlugin } from './registry';
import {
  activePageSections,
  pluginLeafByPath,
  pluginNavItems,
  pluginOfferedPaths,
  pluginPageRoutes,
  pluginPaletteDestinations,
  pluginRouteAccess,
  pluginScreenLabelKey,
  pluginSectionIconForPath,
  recordPageSectionCollisions,
} from './pluginPages';

const load = async () => ({ default: () => null });

const section = (over: Partial<PluginPageSection> = {}): PluginPageSection => ({
  id: 'stock-count',
  labelKey: 'nav.section',
  path: 'stock-count',
  pages: [
    { path: 'count', labelKey: 'nav.count', load },
    { path: 'count-log', labelKey: 'nav.count-log', load },
  ],
  ...over,
});

const register = (code: string, sections: PluginPageSection[]) =>
  registerPlugin({
    code,
    module: definePlugin({
      manifest: { code, version: '3.0.0', pluginApiVersion: 1 },
      pages: sections,
    }),
  });

const setContext = (over: Partial<SlotContext>) => {
  ctx.current = { ...ctx.current, ...over };
};

beforeEach(() => {
  clearPlugins();
  ctx.current = {
    storeId: 'store-a',
    permissions: [],
    storeMode: undefined,
    storePreferences: {
      useConsumptionAndStockFromCustomersForInternalOrders: false,
      monthsUnderstock: undefined,
    },
  };
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('with no plugins loaded', () => {
  it('contributes nothing to any surface', () => {
    expect(activePageSections()).toEqual([]);
    expect(pluginNavItems()).toEqual([]);
    expect(pluginPaletteDestinations()).toEqual([]);
    expect(pluginOfferedPaths()).toEqual([]);
    expect(pluginPageRoutes()).toEqual([]);
    expect(pluginRouteAccess('stock-count/count')).toBeUndefined();
    expect(pluginLeafByPath('stock-count/count')).toBeUndefined();
    expect(pluginSectionIconForPath('stock-count/count')).toBeUndefined();
  });
});

describe('the store-context withhold (capability-class, OMS-REG-PLG-CK-02.1/.2)', () => {
  const dispensaryOnly = () =>
    register('ck', [
      section({ when: context => context.storeMode === 'dispensary' }),
    ]);

  it('withholds the section everywhere while the gate fails, URL included', () => {
    dispensaryOnly();
    setContext({ storeMode: 'store' });
    expect(pluginNavItems()).toEqual([]);
    expect(pluginOfferedPaths()).toEqual([]);
    // The second surface of the same gate: the route redirects, exactly as a
    // capability the store does not have (D70 generalised).
    expect(pluginRouteAccess('stock-count/count')).toEqual({
      kind: 'blocked',
    });
  });

  it('never flashes in while the store mode is unresolved (positive gate)', () => {
    dispensaryOnly();
    setContext({ storeMode: undefined });
    expect(pluginNavItems()).toEqual([]);
    expect(pluginRouteAccess('stock-count/count')).toEqual({
      kind: 'blocked',
    });
  });

  it('offers the section, its pages and its routes where the store is in dispensary mode', () => {
    dispensaryOnly();
    setContext({ storeMode: 'dispensary' });
    const items = pluginNavItems();
    expect(items.map(item => item.id)).toEqual(['stock-count']);
    expect(items[0]?.children?.map(child => child.to)).toEqual([
      'stock-count/count',
      'stock-count/count-log',
    ]);
    expect(pluginRouteAccess('stock-count/count')).toEqual({ kind: 'ok' });
    expect(pluginOfferedPaths()).toEqual([
      'stock-count/count',
      'stock-count/count-log',
    ]);
  });
});

describe('the permission gate (AC-PLUG-P1: one condition, two doors)', () => {
  const gated = () =>
    register('ck', [section({ permissions: ['STOCKTAKE_QUERY'] })]);

  it('withholds the nav entry AND refuses the URL without the permission', () => {
    gated();
    expect(pluginNavItems()).toEqual([]);
    expect(pluginOfferedPaths()).toEqual([]);
    // Denied, not blocked: the function exists here, this user lacks it — the
    // URL stays put under the host's no-permission notice (D94).
    expect(pluginRouteAccess('stock-count/count')).toEqual({ kind: 'denied' });
  });

  it('opens both doors with the permission', () => {
    gated();
    setContext({ permissions: ['STOCKTAKE_QUERY', 'STOCK_LINE_QUERY'] });
    expect(pluginNavItems()).toHaveLength(1);
    expect(pluginRouteAccess('stock-count/count')).toEqual({ kind: 'ok' });
  });

  it('requires EVERY declared permission', () => {
    register('ck', [
      section({ permissions: ['STOCKTAKE_QUERY', 'STOCK_LINE_QUERY'] }),
    ]);
    setContext({ permissions: ['STOCKTAKE_QUERY'] });
    expect(pluginRouteAccess('stock-count/count')).toEqual({ kind: 'denied' });
  });

  it('judges capability before permission when both fail, like the host gates', () => {
    register('ck', [
      section({
        when: context => context.storeMode === 'dispensary',
        permissions: ['STOCKTAKE_QUERY'],
      }),
    ]);
    setContext({ storeMode: 'store', permissions: [] });
    expect(pluginRouteAccess('stock-count/count')).toEqual({
      kind: 'blocked',
    });
  });
});

describe('route matching', () => {
  it("judges a page's subpaths and the section root by the section's gates", () => {
    register('ck', [section()]);
    expect(pluginRouteAccess('stock-count')).toEqual({ kind: 'ok' });
    expect(pluginRouteAccess('stock-count/count/item-7')).toEqual({
      kind: 'ok',
    });
    // Segment boundaries only: a sibling that merely shares the prefix string
    // is nobody's.
    expect(pluginRouteAccess('stock-counting')).toBeUndefined();
  });
});

describe('determinism and collisions', () => {
  it('orders sections by plugin code, whatever the load order', () => {
    register('zebra', [section({ id: 'z', path: 'zebra-pages' })]);
    register('aardvark', [section({ id: 'a', path: 'aardvark-pages' })]);
    expect(activePageSections().map(entry => entry.pluginCode)).toEqual([
      'aardvark',
      'zebra',
    ]);
  });

  it('resolves a cross-plugin path collision by first claim, and names the loser once', () => {
    register('collide_b', [section({ id: 'later', path: 'shared-space' })]);
    register('collide_a', [section({ id: 'earlier', path: 'shared-space' })]);
    const active = activePageSections();
    expect(active).toHaveLength(1);
    expect(active[0]?.pluginCode).toBe('collide_a');

    recordPageSectionCollisions();
    recordPageSectionCollisions();
    const collisionDiagnostics = pluginDiagnostics().filter(
      diagnostic =>
        diagnostic.pluginCode === 'collide_b' &&
        diagnostic.message.includes('shared-space')
    );
    expect(collisionDiagnostics).toHaveLength(1);
    expect(collisionDiagnostics[0]?.level).toBe('warning');
    expect(collisionDiagnostics[0]?.message).toContain('later');
    expect(collisionDiagnostics[0]?.message).toContain('collide_a');
  });
});

describe('menu items and palette rows', () => {
  it('namespaces every label under the plugin code', () => {
    register('ck', [section()]);
    const [item] = pluginNavItems();
    expect(item?.labelKey).toBe('ck:nav.section');
    expect(item?.children?.map(child => child.labelKey)).toEqual([
      'ck:nav.count',
      'ck:nav.count-log',
    ]);
    expect(pluginPaletteDestinations()).toEqual([
      { path: 'stock-count/count', labelKey: 'ck:nav.count' },
      { path: 'stock-count/count-log', labelKey: 'ck:nav.count-log' },
    ]);
  });

  it('keeps item identity across reads, so the menu never remounts a section', () => {
    register('ck', [section()]);
    const first = pluginNavItems()[0];
    setContext({ permissions: ['ANYTHING'] });
    const second = pluginNavItems()[0];
    expect(second).toBe(first);
  });

  it('lists palette rows ungated — the gate lives in each row, per open', () => {
    register('ck', [section({ permissions: ['STOCKTAKE_QUERY'] })]);
    expect(pluginPaletteDestinations()).toHaveLength(2);
    expect(pluginOfferedPaths()).toEqual([]);
  });
});

describe('routes and lazy loading (AC-PLUG-P2)', () => {
  it('generates one route per page without invoking any page loader', () => {
    const loader = vi.fn(load);
    register('ck', [
      section({
        pages: [{ path: 'count', labelKey: 'nav.count', load: loader }],
      }),
    ]);
    const routes = pluginPageRoutes();
    expect(routes.map(route => route.path)).toEqual(['stock-count/count']);
    expect(typeof routes[0]?.Component).toBe('function');
    // Startup cost is zero: enumerating routes (and every other surface) never
    // touches the page's code — only rendering the route does.
    pluginNavItems();
    pluginPaletteDestinations();
    expect(loader).not.toHaveBeenCalled();
  });

  it('hands the router one stable component per page', () => {
    register('ck', [section()]);
    const first = pluginPageRoutes()[0]?.Component;
    const second = pluginPageRoutes()[0]?.Component;
    expect(second).toBe(first);
  });
});

describe('highlight, title and breadcrumb glyph', () => {
  it('resolves the menu leaf for a page and for a record screen beneath it', () => {
    register('ck', [section()]);
    expect(pluginLeafByPath('stock-count/count')?.to).toBe('stock-count/count');
    // A record-ish subpath keeps its page's entry, exactly as a host detail
    // screen keeps its list's (navModel.findLeafByPath's rule).
    expect(pluginLeafByPath('stock-count/count/item-7')?.to).toBe(
      'stock-count/count'
    );
    expect(pluginLeafByPath('inventory/stock')).toBeUndefined();
  });

  it('names a plugin screen by its page label', () => {
    register('ck', [section()]);
    expect(pluginScreenLabelKey('stock-count/count-log')).toBe(
      'ck:nav.count-log'
    );
  });

  it('supplies a section glyph for plugin-owned paths only', () => {
    register('ck', [section()]);
    expect(pluginSectionIconForPath('stock-count/count')).toBeTypeOf(
      'function'
    );
    expect(pluginSectionIconForPath('inventory/stock')).toBeUndefined();
  });
});
