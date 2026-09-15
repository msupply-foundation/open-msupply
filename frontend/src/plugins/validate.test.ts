import { describe, expect, it } from 'vitest';
import {
  PLUGIN_API_MIN_SUPPORTED,
  PLUGIN_API_VERSION,
} from '../plugin-sdk/apiVersion';
import { definePlugin } from '../plugin-sdk/definePlugin';
import { KNOWN_SLOT_IDS, validateLoadedModule } from './validate';

// A component, as validation sees it: any function. `.ts` test file, so no JSX.
const Component = () => null;

const wellFormed = (code = 'demo') =>
  definePlugin({
    manifest: { code, version: '1.0.0', pluginApiVersion: PLUGIN_API_VERSION },
    contributions: [
      {
        slot: 'dashboard.stat',
        id: 'greeting',
        panel: 'replenishment.internal-order',
        Component,
      },
    ],
  });

// The loader hands over a module NAMESPACE, so every fixture is `{ default }`.
const asModule = (value: unknown) => ({ default: value });

const refusal = (verdict: ReturnType<typeof validateLoadedModule>) => {
  expect(verdict.kind).toBe('refused');
  return verdict.kind === 'refused' ? verdict.message : '';
};

describe('validateLoadedModule', () => {
  it('accepts a well-formed bundle with no warnings', () => {
    const verdict = validateLoadedModule('demo', asModule(wellFormed()));
    expect(verdict.kind).toBe('ok');
    if (verdict.kind !== 'ok') return;
    expect(verdict.warnings).toEqual([]);
    expect(verdict.module.manifest.code).toBe('demo');
  });

  it('refuses anything that is not a module', () => {
    expect(refusal(validateLoadedModule('demo', undefined))).toContain(
      'did not evaluate to a module'
    );
  });

  it('refuses a default export without the definePlugin brand', () => {
    // Every field right, brand absent — the exact shape a hand-rolled bundle
    // (or one built against a fork of the SDK) produces.
    const unbranded = {
      manifest: {
        code: 'demo',
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_VERSION,
      },
      contributions: [],
    };
    expect(
      refusal(validateLoadedModule('demo', asModule(unbranded)))
    ).toContain('not a definePlugin() result');
  });

  it('refuses a missing default export', () => {
    expect(
      refusal(validateLoadedModule('demo', { plugin: wellFormed() }))
    ).toContain('not a definePlugin() result');
  });

  it('refuses a missing manifest', () => {
    expect(
      refusal(
        validateLoadedModule(
          'demo',
          asModule({ kind: 'oms.plugin', contributions: [] })
        )
      )
    ).toContain('manifest is missing');
  });

  it('refuses a manifest code that is not the installed code', () => {
    // The code is the plugin's i18n namespace, its data scope, and the prefix
    // of every contribution id, so a mismatch would register under another
    // plugin's identity.
    const message = refusal(
      validateLoadedModule('other_plugin', asModule(wellFormed('demo')))
    );
    expect(message).toContain('"demo"');
    expect(message).toContain('"other_plugin"');
  });

  it.each([['1'], [1.5], [null], [undefined], [Number.NaN]])(
    'refuses a non-integer pluginApiVersion (%p)',
    apiVersion => {
      const module = definePlugin({
        manifest: {
          code: 'demo',
          version: '1.0.0',
          pluginApiVersion: apiVersion as unknown as number,
        },
      });
      expect(refusal(validateLoadedModule('demo', asModule(module)))).toContain(
        'must be an integer'
      );
    }
  );

  it('refuses a plugin built against a newer plugin API (AC-PLUG-V1)', () => {
    // The api_too_new example's shape: valid in every other respect, so the
    // ONLY reason it is refused is the version gate.
    const tooNew = definePlugin({
      manifest: {
        code: 'api_too_new',
        version: '1.0.0',
        pluginApiVersion: 999,
      },
      translations: { en: { label: 'never' } },
      contributions: [
        {
          slot: 'dashboard.stat',
          id: 'never',
          panel: 'replenishment.internal-order',
          Component,
        },
      ],
    });
    const message = refusal(
      validateLoadedModule('api_too_new', asModule(tooNew))
    );
    expect(message).toContain('999');
    expect(message).toContain(String(PLUGIN_API_VERSION));
    expect(message).toContain('newer app version');
  });

  it('refuses a plugin below the supported floor', () => {
    const tooOld = definePlugin({
      manifest: {
        code: 'demo',
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_MIN_SUPPORTED - 1,
      },
    });
    expect(refusal(validateLoadedModule('demo', asModule(tooOld)))).toContain(
      'no longer supports'
    );
  });

  it('loads a downlevel plugin with a warning (AC-PLUG-V2)', () => {
    // Only meaningful once the host has moved past its floor; until then the
    // window is empty and there is nothing to assert but the boundary itself.
    if (PLUGIN_API_MIN_SUPPORTED >= PLUGIN_API_VERSION) {
      expect(PLUGIN_API_MIN_SUPPORTED).toBe(PLUGIN_API_VERSION);
      return;
    }
    const downlevel = definePlugin({
      manifest: {
        code: 'demo',
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_VERSION - 1,
      },
    });
    const verdict = validateLoadedModule('demo', asModule(downlevel));
    expect(verdict.kind).toBe('ok');
    if (verdict.kind !== 'ok') return;
    expect(verdict.warnings).toHaveLength(1);
    expect(verdict.warnings[0]).toContain('older than');
  });

  it('refuses an unknown slot id', () => {
    const module = definePlugin({
      manifest: {
        code: 'demo',
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_VERSION,
      },
      contributions: [
        {
          slot: 'requisitionLine.infoPanel',
          id: 'panel',
          Component,
        } as unknown as never,
      ],
    });
    expect(refusal(validateLoadedModule('demo', asModule(module)))).toContain(
      'unknown slot'
    );
  });

  it('publishes exactly the slots the host has surfaces for', () => {
    expect([...KNOWN_SLOT_IDS].sort()).toEqual([
      'dashboard.body',
      'dashboard.panel',
      'dashboard.stat',
      'dashboard.widget',
      'internalOrder.sidePanelSection',
      'internalOrderLine.column',
      'internalOrderLine.infoPanel',
      'internalOrders.newOrderGate',
      'prescription.paymentForm',
    ]);
  });

  it('accepts a column contribution rendering declaratively, with no Component', () => {
    const module = definePlugin({
      manifest: { code: 'demo', version: '1.0.0', pluginApiVersion: 1 },
      contributions: [
        {
          slot: 'internalOrderLine.column',
          id: 'total',
          header: 'label.total',
          value: row => row.initialStockOnHandUnits + row.incomingUnits,
        },
      ],
    });
    expect(validateLoadedModule('demo', asModule(module)).kind).toBe('ok');
  });

  it('refuses a bare `value` at the info-panel slot — only columns render that way', () => {
    // A bundle offering `value` anywhere but a column slot was built against a
    // surface this host does not have (sdk-contract § contributions).
    const module = definePlugin({
      manifest: { code: 'demo', version: '1.0.0', pluginApiVersion: 1 },
      contributions: [
        {
          slot: 'internalOrderLine.infoPanel',
          id: 'itemInfo',
          value: () => 'nope',
        } as unknown as never,
      ],
    });
    expect(refusal(validateLoadedModule('demo', asModule(module)))).toContain(
      'has no Component function'
    );
  });

  it('refuses a column contribution with neither a Component nor a value', () => {
    const module = definePlugin({
      manifest: { code: 'demo', version: '1.0.0', pluginApiVersion: 1 },
      contributions: [
        {
          slot: 'internalOrderLine.column',
          id: 'total',
          header: 'label.total',
        } as unknown as never,
      ],
    });
    expect(refusal(validateLoadedModule('demo', asModule(module)))).toContain(
      'neither a Component nor a value'
    );
  });

  it('refuses a dashboard contribution rendering declaratively — that slot has no value form', () => {
    const module = definePlugin({
      manifest: { code: 'demo', version: '1.0.0', pluginApiVersion: 1 },
      contributions: [
        {
          slot: 'dashboard.stat',
          id: 'stat',
          panel: 'replenishment.inbound',
          value: () => 1,
        } as unknown as never,
      ],
    });
    expect(refusal(validateLoadedModule('demo', asModule(module)))).toContain(
      'no Component function'
    );
  });

  it('accepts a new-order gate contribution — a resolver, no Component', () => {
    const module = definePlugin({
      manifest: { code: 'demo', version: '1.0.0', pluginApiVersion: 1 },
      contributions: [
        {
          slot: 'internalOrders.newOrderGate',
          id: 'freshness',
          supersedes: () => true,
        },
      ],
    });
    expect(validateLoadedModule('demo', asModule(module)).kind).toBe('ok');
  });

  it('refuses a new-order gate with no supersedes resolver — a Component cannot stand in', () => {
    // The gate is consulted, never rendered (sdk-contract § the new-order gate
    // slot): a bundle offering a Component there was built against a surface
    // this host does not have.
    const module = definePlugin({
      manifest: { code: 'demo', version: '1.0.0', pluginApiVersion: 1 },
      contributions: [
        {
          slot: 'internalOrders.newOrderGate',
          id: 'freshness',
          Component,
        } as unknown as never,
      ],
    });
    expect(refusal(validateLoadedModule('demo', asModule(module)))).toContain(
      'has no supersedes function'
    );
  });

  it('refuses a new-order gate that ALSO carries a Component — a consulted slot never renders', () => {
    // Silently dropping the render half would hide from the author that the
    // surface they built against does not exist here; the wrong form refuses
    // whole, as everywhere (sdk-contract § contributions).
    const module = definePlugin({
      manifest: { code: 'demo', version: '1.0.0', pluginApiVersion: 1 },
      contributions: [
        {
          slot: 'internalOrders.newOrderGate',
          id: 'freshness',
          supersedes: () => true,
          Component,
        } as unknown as never,
      ],
    });
    expect(refusal(validateLoadedModule('demo', asModule(module)))).toContain(
      'consulted, never rendered'
    );
  });

  it('refuses an empty contribution id', () => {
    const module = definePlugin({
      manifest: {
        code: 'demo',
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_VERSION,
      },
      contributions: [
        { slot: 'dashboard.widget', id: '', Component } as unknown as never,
      ],
    });
    expect(refusal(validateLoadedModule('demo', asModule(module)))).toContain(
      'has no id'
    );
  });

  it('refuses a contribution whose Component is not a function', () => {
    const module = definePlugin({
      manifest: {
        code: 'demo',
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_VERSION,
      },
      contributions: [
        {
          slot: 'dashboard.widget',
          id: 'widget',
          Component: 'not a component',
        } as unknown as never,
      ],
    });
    expect(refusal(validateLoadedModule('demo', asModule(module)))).toContain(
      'no Component function'
    );
  });

  it('refuses contributions that are not an array', () => {
    const module = definePlugin({
      manifest: {
        code: 'demo',
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_VERSION,
      },
      contributions: { 'dashboard.widget': [] } as unknown as never,
    });
    expect(refusal(validateLoadedModule('demo', asModule(module)))).toContain(
      'not an array'
    );
  });

  it('refuses the WHOLE plugin for a duplicate (slot, id)', () => {
    const module = definePlugin({
      manifest: {
        code: 'demo',
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_VERSION,
      },
      contributions: [
        { slot: 'dashboard.widget', id: 'twice', Component },
        { slot: 'dashboard.widget', id: 'twice', Component },
      ],
    });
    expect(refusal(validateLoadedModule('demo', asModule(module)))).toContain(
      'duplicate contribution id "twice"'
    );
  });

  it('allows the same id in two different slots', () => {
    // Uniqueness is per (slot, id): the pair is the render key, not the id.
    const module = definePlugin({
      manifest: {
        code: 'demo',
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_VERSION,
      },
      contributions: [
        { slot: 'dashboard.widget', id: 'shared', Component },
        {
          slot: 'dashboard.panel',
          id: 'shared',
          widget: 'replenishment',
          Component,
        },
      ],
    });
    expect(validateLoadedModule('demo', asModule(module)).kind).toBe('ok');
  });

  it('accepts a plugin with no contributions at all', () => {
    // A translations-only or suppress-only plugin is legitimate.
    const module = definePlugin({
      manifest: {
        code: 'demo',
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_VERSION,
      },
      suppress: ['replenishment.inbound'],
    });
    expect(validateLoadedModule('demo', asModule(module)).kind).toBe('ok');
  });
});

describe('validateLoadedModule — pages & nav sections', () => {
  const load = async () => ({ default: Component });

  const navSection = (over: Record<string, unknown> = {}) => ({
    id: 'stockCount',
    labelKey: 'nav.section',
    ...over,
  });

  const page = (over: Record<string, unknown> = {}) => ({
    id: 'count',
    path: 'stock-count/count',
    labelKey: 'nav.count',
    load,
    nav: { in: 'stockCount' },
    ...over,
  });

  const withPages = (pages: unknown, navSections: unknown = [navSection()]) =>
    asModule(
      definePlugin({
        manifest: {
          code: 'demo',
          version: '1.0.0',
          pluginApiVersion: PLUGIN_API_VERSION,
        },
        navSections: navSections as never,
        pages: pages as never,
      })
    );

  const pagesRefusal = (pages: unknown, navSections?: unknown) =>
    refusal(validateLoadedModule('demo', withPages(pages, navSections)));

  it('accepts a well-formed declaration — gates, placements and all', () => {
    const verdict = validateLoadedModule(
      'demo',
      withPages(
        [
          page({ when: () => true, permissions: ['STOCKTAKE_QUERY'] }),
          page({
            id: 'countLog',
            path: 'stock-count/count-log',
            labelKey: 'nav.count-log',
          }),
          // Every placement arm: a host section, the root, and none at all.
          page({ id: 'inv', path: 'ck-inv', nav: { in: 'inventory' } }),
          page({ id: 'top', path: 'ck-top', nav: { root: true } }),
          page({ id: 'detail', path: 'ck-detail', nav: undefined }),
        ],
        [navSection({ when: () => true, permissions: ['STOCKTAKE_QUERY'] })]
      )
    );
    expect(verdict.kind).toBe('ok');
  });

  it('refuses a non-array pages field, and a non-array navSections field', () => {
    expect(pagesRefusal({})).toContain('pages is not an array');
    expect(pagesRefusal([page()], {})).toContain('navSections is not an array');
  });

  it('refuses a page without an id, and a duplicate page id', () => {
    expect(pagesRefusal([page({ id: '' })])).toContain('has no id');
    expect(pagesRefusal([page(), page({ path: 'other' })])).toContain(
      'duplicate page id'
    );
  });

  it('refuses a page or nav section without a labelKey', () => {
    expect(pagesRefusal([page({ labelKey: '' })])).toContain('has no labelKey');
    expect(pagesRefusal([page()], [navSection({ labelKey: '' })])).toContain(
      'has no labelKey'
    );
  });

  it('refuses malformed paths — empty, slashed edges, params', () => {
    for (const path of ['', '/count', 'count/', 'a//b', 'a b', 'x/:id']) {
      expect(pagesRefusal([page({ path })])).toContain('invalid path');
    }
  });

  it('refuses a path colliding with a host destination, at any depth', () => {
    // Exact, below a host destination, and the two off-registry legacy
    // redirects (Home's, and the dispensing vertical's pre-#551 segment) — the
    // router judges by deepest prefix, so nesting would inherit or shadow the
    // host's own gates.
    for (const path of [
      'inventory',
      'inventory/stock/extra',
      'dashboard',
      'dispensary/prescription',
    ]) {
      expect(pagesRefusal([page({ path })])).toContain(
        'collides with the host destination'
      );
    }
  });

  it("refuses two of the plugin's own pages claiming one URL space", () => {
    expect(
      pagesRefusal([
        page(),
        page({ id: 'other', path: 'stock-count/count/deeper' }),
      ])
    ).toContain("collides with this plugin's own");
  });

  it('refuses a page without a load function', () => {
    expect(pagesRefusal([page({ load: undefined })])).toContain(
      'has no load function'
    );
  });

  it('refuses a non-function when gate and a malformed permissions list, page or nav section', () => {
    expect(pagesRefusal([page({ when: true })])).toContain(
      'non-function when gate'
    );
    expect(pagesRefusal([page({ permissions: ['ok', 42] })])).toContain(
      'invalid permissions list'
    );
    expect(pagesRefusal([page()], [navSection({ when: true })])).toContain(
      'non-function when gate'
    );
    expect(
      pagesRefusal([page()], [navSection({ permissions: [''] })])
    ).toContain('invalid permissions list');
  });

  it('refuses a nav section without an id, and a duplicate nav section id', () => {
    expect(pagesRefusal([page()], [navSection({ id: '' })])).toContain(
      'has no id'
    );
    expect(pagesRefusal([page()], [navSection(), navSection()])).toContain(
      'duplicate nav section id'
    );
  });

  it('refuses a nav section id that shadows a host section id', () => {
    // Shadowing would make every `nav.in` naming the id ambiguous.
    expect(
      pagesRefusal(
        [page({ nav: { in: 'inventory' } })],
        [navSection({ id: 'inventory' })]
      )
    ).toContain('shadows the host section');
  });

  // The placement is where new arms join additively; a shape or an id this
  // host does not provide is refused BY NAME, so a bundle built for a newer
  // surface degrades to a clear diagnostic instead of misregistering.
  it('refuses an `in` id that is neither a plugin nav section nor a host section, naming the known set (AC-PLUG-P5)', () => {
    expect(pagesRefusal([page({ nav: { in: 'no-such-section' } })])).toContain(
      "neither one of this plugin's nav sections nor a host section"
    );
    expect(pagesRefusal([page({ nav: { in: 'no-such-section' } })])).toContain(
      '"inventory"'
    );
  });

  it('refuses a malformed nav placement, naming the provided shapes', () => {
    expect(pagesRefusal([page({ nav: 'inventory' })])).toContain(
      'non-object nav placement'
    );
    expect(pagesRefusal([page({ nav: {} })])).toContain(
      'declares neither "in" nor "root"'
    );
    expect(
      pagesRefusal([page({ nav: { in: 'stockCount', root: true } })])
    ).toContain('both "in" and "root"');
    expect(pagesRefusal([page({ nav: { root: 'yes' } })])).toContain(
      'only `root: true` is a placement'
    );
    expect(pagesRefusal([page({ nav: { in: 42 } })])).toContain(
      'invalid "in" id'
    );
  });
});
