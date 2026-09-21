import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HeaderContext } from '@tanstack/solid-table';
import {
  clearPluginTranslations,
  registerPluginTranslations,
} from '../../../intl/pluginTranslations';
import type { InternalOrderLineView } from '../../../plugin-sdk/types';
import type { Column } from '../../../ui/elements/table/columnTypes';
import { getNumberCell } from '../../../ui/elements/table/tableHelpers';
import {
  INTERNAL_ORDER_LINE_COLUMNS,
  mergeLineColumns,
  publishedLineColumnIds,
  sortLinesByContribution,
  type LineColumnBatch,
  type LineColumnContribution,
} from './lineColumns';

// The line table's plugin column region (internal-orders ui-surface § S8).
// Behaviours cited from OMS-REG-REPL-16 (this vertical's slot-region case) and
// the plugin criteria they realise: AC-PLUG-K1 (anchored, reload-stable
// placement), K2 (missing anchor degrades visibly), K4 (batched data), K5
// (namespaced column identity), I1 (namespaced translation).

// A stand-in row: the merge only ever sees rows through `toView`, so a test row
// need only carry what its view mapper reads.
type Row = { id: string; value: number };
const view = (row: Row): InternalOrderLineView =>
  ({ id: row.id, itemName: `item ${row.id}` }) as InternalOrderLineView;

const hostColumn = (id: string): Column<Row, never> => ({
  c: { id },
  header: () => id,
});
const hostColumns = (...ids: string[]) => ids.map(hostColumn);

const contribution = (
  extra: Partial<LineColumnContribution> & { id: string }
): LineColumnContribution =>
  ({
    slot: 'internalOrderLine.column',
    pluginCode: 'demo_plugin',
    header: 'label.total',
    value: (row: InternalOrderLineView) => row.itemName,
    ...extra,
  }) as LineColumnContribution;

const ids = <K extends string>(columns: Column<Row, K>[]) =>
  columns.map(column => column.c.id ?? String(column.c.key));

const headerText = <K extends string>(column: Column<Row, K>) =>
  column.header(undefined as unknown as HeaderContext<Row, unknown>);

const accessed = <K extends string>(column: Column<Row, K>, row: Row) =>
  column.c.accessor?.(row);

afterEach(() => {
  clearPluginTranslations();
  vi.unstubAllGlobals();
});

describe('published column ids (OMS-REG-REPL-16.2)', () => {
  it('publishes the 25 line-table column ids, all unique', () => {
    const all = publishedLineColumnIds();
    expect(all).toHaveLength(25);
    expect(new Set(all).size).toBe(all.length);
  });

  it('names the two anchors the extended-consumption surfaces depend on', () => {
    // The ids CIV's columns anchor to — renaming either breaks an installed
    // plugin's placement, which is the whole point of freezing the set.
    expect(INTERNAL_ORDER_LINE_COLUMNS.amc).toBe('amc');
    expect(INTERNAL_ORDER_LINE_COLUMNS.mos).toBe('mos');
  });
});

describe('mergeLineColumns — no contributions (OMS-REG-REPL-16.1)', () => {
  it('returns the host columns unchanged, by reference', () => {
    const host = hostColumns('comment', 'code', 'itemName');
    const merged = mergeLineColumns(host, [], view);
    expect(merged.columns).toHaveLength(3);
    merged.columns.forEach((column, index) => {
      expect(column).toBe(host[index]);
    });
    expect(merged.diagnostics).toEqual([]);
  });
});

describe('mergeLineColumns — placement (OMS-REG-REPL-16.2, AC-PLUG-K1)', () => {
  it('places a contributed column after its anchor', () => {
    const merged = mergeLineColumns(
      hostColumns('amc', 'mos', 'requested'),
      [contribution({ id: 'totalSoh', anchor: { after: 'amc' } })],
      view
    );
    expect(ids(merged.columns)).toEqual([
      'amc',
      'demo_plugin.totalSoh',
      'mos',
      'requested',
    ]);
  });

  it('places a contributed column before its anchor, and at the end with none', () => {
    const merged = mergeLineColumns(
      hostColumns('amc', 'mos'),
      [
        contribution({ id: 'before', anchor: { before: 'mos' } }),
        contribution({ id: 'tail' }),
      ],
      view
    );
    expect(ids(merged.columns)).toEqual([
      'amc',
      'demo_plugin.before',
      'mos',
      'demo_plugin.tail',
    ]);
  });

  it('is independent of the order the contributions arrive in', () => {
    const host = hostColumns('amc', 'mos');
    const contributions = [
      contribution({ id: 'a', anchor: { after: 'amc' } }),
      contribution({ id: 'b', anchor: { after: 'amc' }, order: 1 }),
      contribution({ id: 'c' }),
    ];
    expect(ids(mergeLineColumns(host, contributions, view).columns)).toEqual(
      ids(mergeLineColumns(host, [...contributions].reverse(), view).columns)
    );
  });
});

describe('mergeLineColumns — identity (AC-PLUG-K5)', () => {
  it('namespaces the merged id with the plugin code', () => {
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [
        contribution({ id: 'total', pluginCode: 'plugin_a' }),
        contribution({ id: 'total', pluginCode: 'plugin_b' }),
      ],
      view
    );
    // Two plugins may both call a column `total`; the persisted column config
    // must be able to tell them apart.
    expect(ids(merged.columns)).toEqual([
      'amc',
      'plugin_a.total',
      'plugin_b.total',
    ]);
  });
});

describe('mergeLineColumns — a hidden or absent anchor (OMS-REG-REPL-16.3, AC-PLUG-K2)', () => {
  it('falls to the table end with a diagnostic when the anchor does not exist', () => {
    const merged = mergeLineColumns(
      hostColumns('amc', 'mos'),
      [contribution({ id: 'orphan', anchor: { after: 'ghost' } })],
      view
    );
    expect(ids(merged.columns)).toEqual(['amc', 'mos', 'demo_plugin.orphan']);
    expect(merged.diagnostics).toHaveLength(1);
    expect(merged.diagnostics[0]!.contributionId).toBe('demo_plugin.orphan');
    expect(merged.diagnostics[0]!.message).toContain('ghost');
  });

  it('treats a preference-gated column its gate hides as absent', () => {
    // `initialSoh` is one of the extended-consumption columns: present only
    // on a program order of a customer-statistics store, so on any other
    // order the host simply does not build it. Its published id still
    // exists — the contribution degrades rather than being refused.
    const gated = mergeLineColumns(
      hostColumns('amc', 'mos', INTERNAL_ORDER_LINE_COLUMNS.initialSoh),
      [
        contribution({
          id: 'afterInitial',
          anchor: { after: INTERNAL_ORDER_LINE_COLUMNS.initialSoh },
        }),
      ],
      view
    );
    expect(ids(gated.columns)).toEqual([
      'amc',
      'mos',
      'initialSoh',
      'demo_plugin.afterInitial',
    ]);
    expect(gated.diagnostics).toEqual([]);

    const ungated = mergeLineColumns(
      hostColumns('amc', 'mos'),
      [
        contribution({
          id: 'afterInitial',
          anchor: { after: INTERNAL_ORDER_LINE_COLUMNS.initialSoh },
        }),
      ],
      view
    );
    expect(ids(ungated.columns)).toEqual([
      'amc',
      'mos',
      'demo_plugin.afterInitial',
    ]);
    expect(ungated.diagnostics).toHaveLength(1);
    expect(ungated.diagnostics[0]!.message).toContain('initialSoh');
  });
});

describe('mergeLineColumns — presentation', () => {
  it('translates the header in the plugin`s own namespace (AC-PLUG-I1)', () => {
    registerPluginTranslations('demo_plugin', {
      en: { 'label.total': 'Total in stock' },
    });
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [contribution({ id: 'total' })],
      view
    );
    expect(headerText(merged.columns[1]!)).toBe('Total in stock');
  });

  it('renders an untranslated header as its namespaced key, never blank', () => {
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [contribution({ id: 'total', header: 'label.missing' })],
      view
    );
    expect(headerText(merged.columns[1]!)).toBe('demo_plugin:label.missing');
  });

  it('renders an `end`-aligned value column as the host`s number cell', () => {
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [contribution({ id: 'total', align: 'end', value: () => 12345.678 })],
      view
    );
    const column = merged.columns[1]!;
    expect(column.meta?.align).toBe('right');
    // The host's own number cell: same alignment and same 2dp locale format a
    // host figure gets.
    expect(column.cell).toBeTypeOf('function');
    expect(String(getNumberCell().meta?.align)).toBe('right');
    expect(accessed(column, { id: 'l1', value: 1 })).toBe(12345.678);
  });

  it('renders a `start`-aligned value column as the host`s text cell', () => {
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [contribution({ id: 'note', align: 'start' })],
      view
    );
    expect(merged.columns[1]!.meta?.align).toBeUndefined();
  });

  it('threads a translated description into the column meta', () => {
    registerPluginTranslations('demo_plugin', {
      en: { 'description.total': 'Initial plus incoming' },
    });
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [contribution({ id: 'total', description: 'description.total' })],
      view
    );
    expect(merged.columns[1]!.meta?.description).toBe('Initial plus incoming');
  });

  it('honours a rem or px width and ignores anything else', () => {
    // A rem width converts against the root font size, the same way every host
    // column's width does (tableHelpers § sizing) — so this one assertion needs
    // a document to read it from.
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('getComputedStyle', () => ({ fontSize: '16px' }));
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [
        contribution({ id: 'rem', width: '8rem' }),
        contribution({ id: 'px', width: '120px' }),
        contribution({ id: 'nonsense', width: '30%' }),
      ],
      view
    );
    const sizes = new Map(
      merged.columns.map(column => [column.c.id, column.size])
    );
    expect(sizes.get('demo_plugin.rem')).toBe(128);
    expect(sizes.get('demo_plugin.px')).toBe(120);
    expect(sizes.get('demo_plugin.nonsense')).toBeUndefined();
  });

  it('is not sortable without a declared sortValue — no sortKey (OMS-REG-REPL-16.4)', () => {
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [contribution({ id: 'total' })],
      view
    );
    expect(merged.columns[1]!.sortKey).toBeUndefined();
  });

  it('is sortable under its namespaced id where the contribution declares a sortValue (OMS-REG-REPL-16.12, AC-PLUG-K7)', () => {
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [contribution({ id: 'total', sortValue: () => 1 })],
      view
    );
    expect(merged.columns[1]!.sortKey).toBe('demo_plugin.total');
  });

  it('gives a sortable Component column its sort value as the accessor — a display column cannot sort', () => {
    const Cell = () => null;
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [
        contribution({
          id: 'aged',
          value: undefined,
          Component: Cell,
          sortValue: row => row.itemName,
        }),
      ],
      view
    );
    const column = merged.columns[1]!;
    expect(column.c.accessor).toBeDefined();
    expect(column.c.accessor?.({ id: 'l1', value: 0 })).toBe('item l1');
    // Without a declared sort the Component column stays a pure display
    // column — no accessor, nothing cached.
    const plain = mergeLineColumns(
      hostColumns('amc'),
      [contribution({ id: 'plain', value: undefined, Component: Cell })],
      view
    );
    expect(plain.columns[1]!.c.accessor).toBeUndefined();
  });
});

describe('mergeLineColumns — batched data (AC-PLUG-K4)', () => {
  const batch = (entries: [string, number][]): LineColumnBatch => ({
    data: new Map([['demo_plugin.total', new Map<string, unknown>(entries)]]),
    loading: false,
  });

  it('hands each row its own entry from the batch', () => {
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [
        contribution({
          id: 'total',
          align: 'end',
          value: (_row, data) => (data as number | undefined) ?? null,
        }),
      ],
      view,
      batch([
        ['l1', 10],
        ['l2', 20],
      ])
    );
    const column = merged.columns[1]!;
    expect(accessed(column, { id: 'l1', value: 0 })).toBe(10);
    expect(accessed(column, { id: 'l2', value: 0 })).toBe(20);
  });

  it('renders a row the loader had no entry for as its empty state', () => {
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [
        contribution({
          id: 'total',
          align: 'end',
          value: (_row, data) => (data as number | undefined) ?? null,
        }),
      ],
      view,
      batch([['l1', 10]])
    );
    expect(
      accessed(merged.columns[1]!, { id: 'missing', value: 0 })
    ).toBeNull();
  });

  it('leaves a contribution with no batch entry undefined data', () => {
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [
        contribution({
          id: 'other',
          value: (_row, data) => (data === undefined ? 'pending' : 'ready'),
        }),
      ],
      view,
      batch([['l1', 10]])
    );
    expect(accessed(merged.columns[1]!, { id: 'l1', value: 0 })).toBe(
      'pending'
    );
  });
});

describe('mergeLineColumns — containment (AC-PLUG-E1)', () => {
  it('blanks a throwing value function rather than failing the table', () => {
    const merged = mergeLineColumns(
      hostColumns('amc'),
      [
        contribution({
          id: 'boom',
          value: () => {
            throw new Error('deliberate');
          },
        }),
      ],
      view
    );
    expect(accessed(merged.columns[1]!, { id: 'l1', value: 0 })).toBe('');
    // The host column beside it is untouched.
    expect(merged.columns[0]).toBeDefined();
  });
});

describe('sortLinesByContribution — the declared sort (OMS-REG-REPL-16.12, AC-PLUG-K7)', () => {
  const rows: Row[] = [
    { id: 'a', value: 3 },
    { id: 'b', value: 1 },
    { id: 'c', value: 2 },
  ];
  const rowIds = (sorted: Row[]) => sorted.map(row => row.id);
  const byValue = contribution({
    id: 'last-counted',
    sortValue: (_line: InternalOrderLineView, data?: unknown) =>
      data as number | null | undefined,
  });
  const entries = (pairs: [string, unknown][]) => new Map(pairs);

  it('orders numbers numerically, in each direction', () => {
    const data = entries([
      ['a', 3],
      ['b', 1],
      ['c', 2],
    ]);
    expect(
      rowIds(sortLinesByContribution(rows, view, byValue, data, false))
    ).toEqual(['b', 'c', 'a']);
    expect(
      rowIds(sortLinesByContribution(rows, view, byValue, data, true))
    ).toEqual(['a', 'c', 'b']);
  });

  it('orders strings by locale', () => {
    const data = entries([
      ['a', 'Zoe'],
      ['b', 'ada'],
      ['c', 'Mia'],
    ]);
    expect(
      rowIds(sortLinesByContribution(rows, view, byValue, data, false))
    ).toEqual(['b', 'c', 'a']);
  });

  it('sorts a null or undefined value last, in either direction', () => {
    const data = entries([
      ['a', null],
      ['b', 2],
      ['c', 1],
    ]);
    expect(
      rowIds(sortLinesByContribution(rows, view, byValue, data, false))
    ).toEqual(['c', 'b', 'a']);
    expect(
      rowIds(sortLinesByContribution(rows, view, byValue, data, true))
    ).toEqual(['b', 'c', 'a']);
    // A row the loader returned no entry for reads undefined — also last.
    const sparse = entries([
      ['b', 2],
      ['c', 1],
    ]);
    expect(
      rowIds(sortLinesByContribution(rows, view, byValue, sparse, true))
    ).toEqual(['b', 'c', 'a']);
  });

  it('lets an Infinity sentinel place "no value" first on a stalest-first sort', () => {
    // The contract's escape hatch: never-counted maps to Infinity, so a
    // descending (stalest-first) sort leads with it — and two sentinels
    // read as equal rather than NaN-scrambling the comparator.
    const data = entries([
      ['a', Infinity],
      ['b', 4],
      ['c', Infinity],
    ]);
    const sorted = rowIds(
      sortLinesByContribution(rows, view, byValue, data, true)
    );
    expect(sorted[2]).toBe('b');
    expect(new Set(sorted.slice(0, 2))).toEqual(new Set(['a', 'c']));
  });

  it('reads a throwing sortValue as no value, contained and named once', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const throwing = contribution({
      id: 'boom',
      sortValue: (line: InternalOrderLineView) => {
        if (line.id === 'b') throw new Error('deliberate');
        return 1;
      },
    });
    const sorted = rowIds(
      sortLinesByContribution(rows, view, throwing, entries([]), false)
    );
    expect(sorted[2]).toBe('b');
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('returns the rows untouched when the contribution declares no sort', () => {
    expect(
      rowIds(
        sortLinesByContribution(
          rows,
          view,
          contribution({ id: 'plain' }),
          undefined,
          false
        )
      )
    ).toEqual(['a', 'b', 'c']);
  });
});
