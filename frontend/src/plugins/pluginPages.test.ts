import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PluginNavSection,
  PluginPage,
  SlotContext,
} from '../plugin-sdk/types';

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
import { HOST_NAV_SECTION_IDS } from '../plugin-sdk/types';
import { upperNav } from '../ui/layout/AppShell/navModel';
import { pluginDiagnostics } from './diagnostics';
import { clearPlugins, registerPlugin } from './registry';
import {
  activePages,
  mergeUpperNav,
  pluginLeafByPath,
  pluginNavItems,
  pluginOfferedPaths,
  pluginPageRoutes,
  pluginPaletteDestinations,
  pluginRouteAccess,
  pluginScreenLabelKey,
  pluginSectionIconForPath,
  recordPagePathCollisions,
} from './pluginPages';

const load = async () => ({ default: () => null });

const navSection = (
  over: Partial<PluginNavSection> = {}
): PluginNavSection => ({
  id: 'stockCount',
  labelKey: 'nav.section',
  ...over,
});

const page = (over: Partial<PluginPage> = {}): PluginPage => ({
  id: 'count',
  path: 'stock-count/count',
  labelKey: 'nav.count',
  load,
  nav: { in: 'stockCount' },
  ...over,
});

const countLog = (over: Partial<PluginPage> = {}): PluginPage =>
  page({
    id: 'countLog',
    path: 'stock-count/count-log',
    labelKey: 'nav.count-log',
    ...over,
  });

const register = (
  code: string,
  pages: PluginPage[],
  navSections: PluginNavSection[] = [navSection()]
) =>
  registerPlugin({
    code,
    module: definePlugin({
      manifest: { code, version: '3.0.0', pluginApiVersion: 1 },
      navSections,
      pages,
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
    expect(activePages()).toEqual([]);
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
    register(
      'ck',
      [page(), countLog()],
      [navSection({ when: context => context.storeMode === 'dispensary' })]
    );

  it('withholds every page in a gated group everywhere while the gate fails, URL included', () => {
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

  it('offers the group, its pages and their routes where the store is in dispensary mode', () => {
    dispensaryOnly();
    setContext({ storeMode: 'dispensary' });
    const items = pluginNavItems();
    expect(items.map(item => item.id)).toEqual(['ck.stockCount']);
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

  it("composes a page's own when gate with its group's — either withholds it", () => {
    register(
      'ck',
      [
        page({ when: context => context.storeMode === 'dispensary' }),
        countLog(),
      ],
      [navSection()]
    );
    setContext({ storeMode: 'store' });
    // The group stays (count-log is offered); only the gated page is withheld.
    const [group] = pluginNavItems();
    expect(group?.children?.map(child => child.to)).toEqual([
      'stock-count/count-log',
    ]);
    expect(pluginRouteAccess('stock-count/count')).toEqual({
      kind: 'blocked',
    });
    expect(pluginRouteAccess('stock-count/count-log')).toEqual({ kind: 'ok' });
  });

  it('does not render a group none of whose pages is offered', () => {
    register(
      'ck',
      [page({ when: () => false })],
      [navSection()]
    );
    expect(pluginNavItems()).toEqual([]);
    expect(mergeUpperNav([...upperNav]).items.map(item => item.id)).toEqual(
      upperNav.map(item => item.id)
    );
  });
});

describe('gate containment (rules § error isolation)', () => {
  it('withholds a page whose when gate throws — named in diagnostics once, never crashing the shell', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    register('ck', [
      page({
        when: () => {
          throw new Error('broken plugin gate');
        },
      }),
    ]);
    // The gate runs inside the shell's own memos (menu, route verdict,
    // palette): a throw must degrade to "withheld", exactly like a false.
    expect(pluginNavItems()).toEqual([]);
    expect(pluginOfferedPaths()).toEqual([]);
    expect(pluginRouteAccess('stock-count/count')).toEqual({
      kind: 'blocked',
    });
    const failures = pluginDiagnostics().filter(
      diagnostic =>
        diagnostic.pluginCode === 'ck' &&
        diagnostic.message.includes('when gate threw')
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]?.level).toBe('error');
  });

  it('accepts a truthy non-boolean gate result (a JS-authored `a && b` gate)', () => {
    register('ck', [
      // A JS plugin gets no type checking: `permissions.length && storeMode`
      // style gates legitimately return a non-boolean truthy value.
      page({
        when: context => context.storeMode as unknown as boolean,
      }),
    ]);
    setContext({ storeMode: 'dispensary' });
    expect(pluginNavItems()).toHaveLength(1);
    expect(pluginRouteAccess('stock-count/count')).toEqual({ kind: 'ok' });
  });
});

describe('the permission gate (AC-PLUG-P1: one condition, two doors)', () => {
  const gated = () =>
    register('ck', [page({ permissions: ['STOCKTAKE_QUERY'] })]);

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

  it('requires EVERY declared permission, group and page composed', () => {
    register(
      'ck',
      [page({ permissions: ['STOCKTAKE_QUERY'] })],
      [navSection({ permissions: ['STOCK_LINE_QUERY'] })]
    );
    setContext({ permissions: ['STOCKTAKE_QUERY'] });
    expect(pluginRouteAccess('stock-count/count')).toEqual({ kind: 'denied' });
    setContext({ permissions: ['STOCKTAKE_QUERY', 'STOCK_LINE_QUERY'] });
    expect(pluginRouteAccess('stock-count/count')).toEqual({ kind: 'ok' });
  });

  it('judges capability before permission when both fail, like the host gates', () => {
    register('ck', [
      page({
        when: context => context.storeMode === 'dispensary',
        permissions: ['STOCKTAKE_QUERY'],
      }),
    ]);
    setContext({ storeMode: 'store', permissions: [] });
    expect(pluginRouteAccess('stock-count/count')).toEqual({
      kind: 'blocked',
    });
  });

  it("judges a group's failed capability ahead of the page's failed permission", () => {
    register(
      'ck',
      [page({ permissions: ['STOCKTAKE_QUERY'] })],
      [navSection({ when: context => context.storeMode === 'dispensary' })]
    );
    setContext({ storeMode: 'store', permissions: [] });
    expect(pluginRouteAccess('stock-count/count')).toEqual({
      kind: 'blocked',
    });
  });
});

describe('route matching', () => {
  it("judges a page's subpaths by the page's gates", () => {
    register('ck', [page()]);
    // A record-ish subpath is the page's own to interpret.
    expect(pluginRouteAccess('stock-count/count/item-7')).toEqual({
      kind: 'ok',
    });
    // Segment boundaries only: a sibling that merely shares the prefix string
    // is nobody's.
    expect(pluginRouteAccess('stock-count/counting')).toBeUndefined();
    // No page claims the bare group prefix — a group has no path of its own.
    expect(pluginRouteAccess('stock-count')).toBeUndefined();
  });

  it('routes a page with no nav placement — a menu-less detail screen', () => {
    register('ck', [page({ nav: undefined })]);
    expect(pluginRouteAccess('stock-count/count')).toEqual({ kind: 'ok' });
    expect(pluginPageRoutes().map(route => route.path)).toEqual([
      'stock-count/count',
    ]);
    // No menu entry and no palette row: reached from the plugin's own UI,
    // exactly like a host record screen.
    expect(pluginNavItems()).toEqual([]);
    expect(pluginPaletteDestinations()).toEqual([]);
    expect(pluginOfferedPaths()).toEqual([]);
  });
});

describe('determinism and collisions', () => {
  it('orders pages by plugin code, whatever the load order', () => {
    register('zebra', [page({ id: 'z', path: 'zebra-pages' })], []);
    register('aardvark', [page({ id: 'a', path: 'aardvark-pages' })], []);
    expect(activePages().map(entry => entry.pluginCode)).toEqual([
      'aardvark',
      'zebra',
    ]);
  });

  it('resolves a cross-plugin path collision by first claim, and names the loser once', () => {
    register('collide_b', [page({ id: 'later', path: 'shared-space' })], []);
    register('collide_a', [page({ id: 'earlier', path: 'shared-space' })], []);
    const active = activePages();
    expect(active).toHaveLength(1);
    expect(active[0]?.pluginCode).toBe('collide_a');

    recordPagePathCollisions();
    recordPagePathCollisions();
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
    register('ck', [page(), countLog()]);
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

  it('keeps item identity across reads, so the menu never remounts a group', () => {
    register('ck', [page(), countLog()]);
    const first = pluginNavItems()[0];
    setContext({ permissions: ['ANYTHING'] });
    const second = pluginNavItems()[0];
    expect(second).toBe(first);
  });

  it('lists palette rows ungated — the gate lives in each row, per open', () => {
    register('ck', [
      page({ permissions: ['STOCKTAKE_QUERY'] }),
      countLog({ permissions: ['STOCKTAKE_QUERY'] }),
    ]);
    expect(pluginPaletteDestinations()).toHaveLength(2);
    expect(pluginOfferedPaths()).toEqual([]);
  });
});

describe('menu placement (anchors)', () => {
  // The gated host list as ShellLayout hands it in — everything offered.
  const allHosts = () => [...upperNav];
  const menuIds = (hosts = allHosts()) =>
    mergeUpperNav(hosts).items.map(item => item.id);

  it('publishes exactly the real upper sections as anchor targets', () => {
    // The SDK's const union and the live menu can never drift: this is the
    // honesty guard, like SLOT_IDS' exhaustive Record for slot ids.
    expect([...HOST_NAV_SECTION_IDS]).toEqual(upperNav.map(item => item.id));
  });

  it('defaults an unanchored group to the end of the upper list', () => {
    register('ck', [page()]);
    const ids = menuIds();
    expect(ids[ids.length - 1]).toBe('ck.stockCount');
  });

  it('places a group before / after its anchor target', () => {
    register('ck', [page()], [navSection({ anchor: { before: 'inventory' } })]);
    const ids = menuIds();
    expect(ids.indexOf('ck.stockCount')).toBe(ids.indexOf('inventory') - 1);

    clearPlugins();
    register('ck', [page()], [navSection({ anchor: { after: 'inventory' } })]);
    const after = menuIds();
    expect(after.indexOf('ck.stockCount')).toBe(after.indexOf('inventory') + 1);
  });

  it('degrades an anchor to a gate-hidden section to the end, reported', () => {
    register(
      'ck',
      [page()],
      [navSection({ anchor: { before: 'dispensary' } })]
    );
    // The store is not a dispensary: gateNav dropped the section, so the
    // published id has no rendered position.
    const hosts = allHosts().filter(item => item.id !== 'dispensary');
    const { items, diagnostics } = mergeUpperNav(hosts);
    expect(items[items.length - 1]?.id).toBe('ck.stockCount');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.contributionId).toBe('ck.stockCount');
    expect(diagnostics[0]?.message).toContain('dispensary');
  });

  it('keeps registry order between groups sharing a coordinate', () => {
    register(
      'zebra',
      [page({ id: 'z', path: 'z-pages', nav: { in: 'zSection' } })],
      [navSection({ id: 'zSection', anchor: { before: 'inventory' } })]
    );
    register(
      'aardvark',
      [page({ id: 'a', path: 'a-pages', nav: { in: 'aSection' } })],
      [navSection({ id: 'aSection', anchor: { before: 'inventory' } })]
    );
    const ids = menuIds();
    const inventory = ids.indexOf('inventory');
    expect(ids.slice(inventory - 2, inventory)).toEqual([
      'aardvark.aSection',
      'zebra.zSection',
    ]);
  });

  it('places a root page as a top-level entry, anchored like a group', () => {
    register(
      'ck',
      [
        page({
          nav: { root: true, anchor: { after: 'inventory' } },
        }),
      ],
      []
    );
    const ids = menuIds();
    expect(ids.indexOf('stock-count/count')).toBe(ids.indexOf('inventory') + 1);
    const item = mergeUpperNav(allHosts()).items.find(
      candidate => candidate.id === 'stock-count/count'
    );
    // A leaf, not a group: it navigates rather than expands.
    expect(item?.children).toBeUndefined();
    expect(item?.to).toBe('stock-count/count');
  });

  it('folds a page placed in a HOST section into its children, anchored against them', () => {
    const inventory = upperNav.find(item => item.id === 'inventory');
    const firstChild = inventory?.children?.[0]?.id;
    register(
      'ck',
      [
        page({
          nav: { in: 'inventory', anchor: { before: firstChild ?? '' } },
        }),
      ],
      []
    );
    const { items, diagnostics } = mergeUpperNav(allHosts());
    // No new top-level entry…
    expect(items.map(item => item.id)).toEqual(upperNav.map(item => item.id));
    // …the page is the section's first child instead.
    const merged = items.find(item => item.id === 'inventory');
    expect(merged?.children?.[0]?.to).toBe('stock-count/count');
    expect(merged?.children?.map(child => child.id)).toContain(firstChild);
    expect(diagnostics).toEqual([]);
    // The host item is a fresh object (its children changed) but stable
    // across reads, so the menu never remounts the section.
    expect(mergeUpperNav(allHosts()).items.find(i => i.id === 'inventory')).toBe(
      merged
    );
  });

  it('degrades a bad child anchor inside a host section to the end, reported', () => {
    register(
      'ck',
      [page({ nav: { in: 'inventory', anchor: { before: 'no-such-id' } } })],
      []
    );
    const { items, diagnostics } = mergeUpperNav(allHosts());
    const merged = items.find(item => item.id === 'inventory');
    const children = merged?.children ?? [];
    expect(children[children.length - 1]?.to).toBe('stock-count/count');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.contributionId).toBe('ck.count');
  });
});

describe('routes and lazy loading (AC-PLUG-P2)', () => {
  it('generates one route per page without invoking any page loader', () => {
    const loader = vi.fn(load);
    register('ck', [page({ load: loader })]);
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
    register('ck', [page()]);
    const first = pluginPageRoutes()[0]?.Component;
    const second = pluginPageRoutes()[0]?.Component;
    expect(second).toBe(first);
  });
});

describe('highlight, title and breadcrumb glyph', () => {
  it('resolves the menu leaf for a page and for a record screen beneath it', () => {
    register('ck', [page(), countLog()]);
    expect(pluginLeafByPath('stock-count/count')?.to).toBe('stock-count/count');
    // A record-ish subpath keeps its page's entry, exactly as a host detail
    // screen keeps its list's (navModel.findLeafByPath's rule).
    expect(pluginLeafByPath('stock-count/count/item-7')?.to).toBe(
      'stock-count/count'
    );
    expect(pluginLeafByPath('inventory/stock')).toBeUndefined();
  });

  it('names a plugin screen by its page label', () => {
    register('ck', [page(), countLog()]);
    expect(pluginScreenLabelKey('stock-count/count-log')).toBe(
      'ck:nav.count-log'
    );
  });

  it('names a menu-less page too — the tab and breadcrumb work without a placement', () => {
    register('ck', [page({ nav: undefined })]);
    expect(pluginScreenLabelKey('stock-count/count')).toBe('ck:nav.count');
    expect(pluginSectionIconForPath('stock-count/count')).toBeTypeOf(
      'function'
    );
  });

  it('supplies a section glyph exactly where a page claims the path', () => {
    register('ck', [page()]);
    expect(pluginSectionIconForPath('stock-count/count')).toBeTypeOf(
      'function'
    );
    // A record screen keeps its page's glyph, like its highlight.
    expect(pluginSectionIconForPath('stock-count/count/item-7')).toBeTypeOf(
      'function'
    );
    expect(pluginSectionIconForPath('inventory/stock')).toBeUndefined();
    // A group has no path — an unclaimed prefix renders the not-found page,
    // which highlights nothing and gets no glyph, exactly like a host unknown
    // path.
    expect(pluginSectionIconForPath('stock-count')).toBeUndefined();
    expect(pluginLeafByPath('stock-count')).toBeUndefined();
  });
});
