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
      'internalOrderLine.column',
      'internalOrderLine.infoPanel',
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

describe('validateLoadedModule — pages', () => {
  const load = async () => ({ default: Component });

  const pageSection = (over: Record<string, unknown> = {}) => ({
    id: 'stock-count',
    labelKey: 'nav.section',
    path: 'stock-count',
    pages: [{ path: 'count', labelKey: 'nav.count', load }],
    ...over,
  });

  const withPages = (pages: unknown) =>
    asModule(
      definePlugin({
        manifest: {
          code: 'demo',
          version: '1.0.0',
          pluginApiVersion: PLUGIN_API_VERSION,
        },
        pages: pages as never,
      })
    );

  const pagesRefusal = (pages: unknown) =>
    refusal(validateLoadedModule('demo', withPages(pages)));

  it('accepts a well-formed pages declaration, gates included', () => {
    const verdict = validateLoadedModule(
      'demo',
      withPages([
        pageSection({
          when: () => true,
          permissions: ['STOCKTAKE_QUERY'],
          pages: [
            { path: 'count', labelKey: 'nav.count', load },
            { path: 'count-log', labelKey: 'nav.count-log', load },
          ],
        }),
      ])
    );
    expect(verdict.kind).toBe('ok');
  });

  it('refuses a non-array pages field', () => {
    expect(pagesRefusal({})).toContain('pages is not an array');
  });

  it('refuses a section without an id, and a duplicate section id', () => {
    expect(pagesRefusal([pageSection({ id: '' })])).toContain('has no id');
    expect(
      pagesRefusal([pageSection(), pageSection({ path: 'other' })])
    ).toContain('duplicate pages section id');
  });

  it('refuses a section without a labelKey', () => {
    expect(pagesRefusal([pageSection({ labelKey: '' })])).toContain(
      'has no labelKey'
    );
  });

  it('refuses malformed paths — empty, slashed edges, params', () => {
    for (const path of ['', '/count', 'count/', 'a//b', 'a b', 'x/:id']) {
      expect(pagesRefusal([pageSection({ path })])).toContain('invalid path');
    }
  });

  it('refuses a path colliding with a host destination, at any depth', () => {
    // Exact, below a host destination, and the off-registry legacy redirect —
    // the router judges by deepest prefix, so nesting would inherit or shadow
    // the host's own gates.
    for (const path of ['inventory', 'inventory/stock/extra', 'dashboard']) {
      expect(pagesRefusal([pageSection({ path })])).toContain(
        'collides with the host destination'
      );
    }
  });

  it("refuses two of the plugin's own sections claiming one URL space", () => {
    expect(
      pagesRefusal([
        pageSection(),
        pageSection({ id: 'other', path: 'stock-count/deeper' }),
      ])
    ).toContain("collides with this plugin's own");
  });

  it('refuses a section with no pages', () => {
    expect(pagesRefusal([pageSection({ pages: [] })])).toContain(
      'declares no pages'
    );
  });

  it('refuses a page without a load function, a labelKey, or a unique path', () => {
    expect(
      pagesRefusal([
        pageSection({ pages: [{ path: 'count', labelKey: 'nav.count' }] }),
      ])
    ).toContain('has no load function');
    expect(
      pagesRefusal([
        pageSection({ pages: [{ path: 'count', labelKey: '', load }] }),
      ])
    ).toContain('has no labelKey');
    expect(
      pagesRefusal([
        pageSection({
          pages: [
            { path: 'count', labelKey: 'nav.count', load },
            { path: 'count', labelKey: 'nav.count-again', load },
          ],
        }),
      ])
    ).toContain('twice');
  });

  it('refuses a non-function when gate and a malformed permissions list', () => {
    expect(pagesRefusal([pageSection({ when: true })])).toContain(
      'non-function when gate'
    );
    expect(pagesRefusal([pageSection({ permissions: ['ok', 42] })])).toContain(
      'invalid permissions list'
    );
    expect(pagesRefusal([pageSection({ permissions: [''] })])).toContain(
      'invalid permissions list'
    );
  });
});
