import { describe, expect, it } from 'vitest';
import {
  buildDynamicFilter,
  customFieldDisplay,
  customFieldValue,
  orderOptionsHierarchically,
  parseCustomFields,
  partitionCustomFields,
  resolveOptionName,
  shownCustomFields,
  type CustomFieldDef,
  type CustomFieldOption,
} from './customFields';

// The shared custom-field logic (spec/ui-standards/custom-fields). The reference
// dataset configures no custom fields, so these assert the contract-grounded
// logic (parsing, value-type display, display-mode partitioning, option
// hierarchy, the dynamicFilter AST); populated live behaviour is a recorded gap.

const option = (over: Partial<CustomFieldOption> = {}): CustomFieldOption => ({
  id: 'o1',
  key: 'o1',
  name: 'Option 1',
  parentOptionId: null,
  ...over,
});

const def = (over: Partial<CustomFieldDef> = {}): CustomFieldDef => ({
  id: 'cf1',
  key: 'field',
  name: 'Field',
  valueType: 'TEXT',
  kind: 'STANDARD',
  displayMode: 'VISIBLE',
  options: [],
  ...over,
});

describe('parseCustomFields — the JSON boundary', () => {
  it('accepts an object, a JSON string, and coerces junk to {}', () => {
    expect(parseCustomFields({ a: 1 })).toEqual({ a: 1 });
    expect(parseCustomFields('{"a":1}')).toEqual({ a: 1 });
    expect(parseCustomFields(null)).toEqual({});
    expect(parseCustomFields('not json')).toEqual({});
    expect(parseCustomFields(42)).toEqual({});
  });

  it('reads a value by key, undefined when unset', () => {
    expect(customFieldValue({ field: 'x' }, 'field')).toBe('x');
    expect(customFieldValue({ field: 'x' }, 'other')).toBeUndefined();
  });
});

describe('customFieldDisplay — value-type rendering', () => {
  it('boolean → checked state', () => {
    expect(
      customFieldDisplay(def({ valueType: 'BOOLEAN' }), { field: true })
    ).toEqual({
      kind: 'boolean',
      checked: true,
    });
  });

  it('option → stored id resolved to its name', () => {
    const d = def({
      valueType: 'OPTION',
      options: [option({ id: 'o1', name: 'High' })],
    });
    expect(customFieldDisplay(d, { field: 'o1' })).toEqual({
      kind: 'option',
      id: 'o1',
      name: 'High',
    });
  });

  it('option → falls back to the raw id when unresolved', () => {
    const d = def({ valueType: 'OPTION', options: [] });
    expect(resolveOptionName(d, 'missing')).toBe('missing');
  });

  it('everything else → text, blank when unset', () => {
    expect(customFieldDisplay(def(), { field: 'hello' })).toEqual({
      kind: 'text',
      text: 'hello',
    });
    expect(customFieldDisplay(def(), {})).toEqual({ kind: 'text', text: '' });
  });
});

describe('partitionCustomFields — display-mode placement', () => {
  const defs = [
    def({ key: 'a', displayMode: 'VISIBLE' }),
    def({ key: 'b', displayMode: 'PROMINENT' }),
    def({ key: 'c', displayMode: 'HIDDEN' }),
    def({ key: 'd', displayMode: 'OTHER' }),
    def({ key: 'e', displayMode: null }),
  ];

  it('drops HIDDEN / OTHER / null; keeps VISIBLE + PROMINENT', () => {
    expect(shownCustomFields(defs).map(d => d.key)).toEqual(['a', 'b']);
  });

  it('promote:true → prominent to toolbar, visible to tab', () => {
    const { tab, prominent } = partitionCustomFields(defs, true);
    expect(tab.map(d => d.key)).toEqual(['a']);
    expect(prominent.map(d => d.key)).toEqual(['b']);
  });

  it('promote:false (read-only) → everything shown in the tab', () => {
    const { tab, prominent } = partitionCustomFields(defs, false);
    expect(tab.map(d => d.key)).toEqual(['a', 'b']);
    expect(prominent).toEqual([]);
  });
});

describe('orderOptionsHierarchically — depth-first tree', () => {
  it('nests children under parents with a depth, orphans as roots', () => {
    const options = [
      option({ id: 'child', parentOptionId: 'root' }),
      option({ id: 'root', parentOptionId: null }),
      option({ id: 'grandchild', parentOptionId: 'child' }),
      option({ id: 'orphan', parentOptionId: 'ghost' }),
    ];
    expect(
      orderOptionsHierarchically(options).map(o => [o.option.id, o.depth])
    ).toEqual([
      ['root', 0],
      ['child', 1],
      ['grandchild', 2],
      ['orphan', 0],
    ]);
  });
});

describe('buildDynamicFilter — the list filter AST', () => {
  it('ANDs non-empty conditions, dropping blanks', () => {
    expect(buildDynamicFilter({ a: 'x', b: '', c: '  ', d: 'y' })).toEqual({
      And: [
        { CustomField: { key: 'a', filter: { Text: { Like: 'x' } } } },
        { CustomField: { key: 'd', filter: { Text: { Like: 'y' } } } },
      ],
    });
  });

  it('undefined when nothing active (a no-op filter)', () => {
    expect(buildDynamicFilter({})).toBeUndefined();
    expect(buildDynamicFilter({ a: '' })).toBeUndefined();
    expect(buildDynamicFilter(undefined)).toBeUndefined();
  });
});
