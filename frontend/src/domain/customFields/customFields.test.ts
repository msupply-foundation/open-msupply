import { describe, expect, it } from 'vitest';
import {
  ancestorIds,
  optionAndDescendantIds,
  orderOptionsHierarchically,
  parseCustomField,
  parseCustomFields,
  partitionCustomFields,
  shownCustomFields,
  type CustomFieldDef,
  type CustomFieldOption,
} from './parse';
import { buildCustomFieldDynamicFilter } from './filter';
import {
  customFieldDisplayString,
  customFieldFormText,
  EMPTY_FIELD_VALUE,
} from './display';

// The shared custom-field interpreter (spec/ui-standards/custom-fields). The
// reference dataset configures no custom fields, so these assert the contract-
// grounded pure logic: the value-type → kind parse, display-mode partitioning,
// the option hierarchy, and the typed dynamicFilter AST.

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

describe('parseCustomField — value type → kind', () => {
  it('maps each value type to its kind', () => {
    expect(parseCustomField(def({ valueType: 'TEXT' })).kind).toBe('text');
    expect(parseCustomField(def({ valueType: 'BOOLEAN' })).kind).toBe(
      'boolean'
    );
    expect(parseCustomField(def({ valueType: 'DATE' })).kind).toBe('date');
    expect(parseCustomField(def({ valueType: 'OPTION' })).kind).toBe('option');
    const int = parseCustomField(def({ valueType: 'INTEGER' }));
    const real = parseCustomField(def({ valueType: 'REAL' }));
    expect(int.kind === 'number' && int.integer).toBe(true);
    expect(real.kind === 'number' && real.integer).toBe(false);
  });
});

describe('parseCustomFields — the JSON boundary', () => {
  it('accepts an object or JSON string; coerces junk to {}', () => {
    expect(parseCustomFields({ a: 1 })).toEqual({ a: 1 });
    expect(parseCustomFields('{"a":1}')).toEqual({ a: 1 });
    expect(parseCustomFields(null)).toEqual({});
    expect(parseCustomFields('not json')).toEqual({});
  });
});

describe('display-mode partitioning', () => {
  const defs = [
    def({ key: 'a', displayMode: 'VISIBLE' }),
    def({ key: 'b', displayMode: 'PROMINENT' }),
    def({ key: 'c', displayMode: 'HIDDEN' }),
    def({ key: 'd', displayMode: 'OTHER' }),
    def({ key: 'e', displayMode: null }),
  ];

  it('shownCustomFields drops HIDDEN / OTHER / null', () => {
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

describe('option hierarchy', () => {
  const options = [
    option({ id: 'child', parentOptionId: 'root' }),
    option({ id: 'root', parentOptionId: null }),
    option({ id: 'grandchild', parentOptionId: 'child' }),
    option({ id: 'orphan', parentOptionId: 'ghost' }),
  ];

  it('orders depth-first with depth; orphans as roots', () => {
    expect(
      orderOptionsHierarchically(options).map(o => [o.option.id, o.depth])
    ).toEqual([
      ['root', 0],
      ['child', 1],
      ['grandchild', 2],
      ['orphan', 0],
    ]);
  });

  it('optionAndDescendantIds returns the id plus all descendants', () => {
    expect(optionAndDescendantIds(options, 'root').sort()).toEqual([
      'child',
      'grandchild',
      'root',
    ]);
    expect(optionAndDescendantIds(options, 'grandchild')).toEqual([
      'grandchild',
    ]);
  });

  it('ancestorIds returns the parent chain, nearest first', () => {
    expect(ancestorIds(options, 'grandchild')).toEqual(['child', 'root']);
    expect(ancestorIds(options, 'root')).toEqual([]);
    expect(ancestorIds(options, 'orphan')).toEqual([]);
  });
});

describe('buildCustomFieldDynamicFilter — typed AST per kind', () => {
  it('emits the right operator for each value kind', () => {
    expect(
      buildCustomFieldDynamicFilter({
        note: { kind: 'text', contains: 'x' },
        active: { kind: 'boolean', value: true },
        region: { kind: 'option', optionIds: ['r1', 'r2'] },
        count: { kind: 'number', min: 1, max: 5 },
        due: { kind: 'date', from: '2026-01-01' },
      })
    ).toEqual({
      And: [
        { CustomField: { key: 'note', filter: { Text: { Like: 'x' } } } },
        {
          CustomField: { key: 'active', filter: { Boolean: { Equal: true } } },
        },
        {
          CustomField: {
            key: 'region',
            filter: { Option: { In: ['r1', 'r2'] } },
          },
        },
        {
          CustomField: {
            key: 'count',
            filter: { Number: { GreaterThanOrEqual: 1 } },
          },
        },
        {
          CustomField: {
            key: 'count',
            filter: { Number: { LowerThanOrEqual: 5 } },
          },
        },
        {
          CustomField: {
            key: 'due',
            filter: { Date: { GreaterThanOrEqual: '2026-01-01' } },
          },
        },
      ],
    });
  });

  it('drops empty values and returns undefined for a no-op filter', () => {
    expect(
      buildCustomFieldDynamicFilter({
        note: { kind: 'text', contains: '' },
        empty: null,
      })
    ).toBeUndefined();
    expect(buildCustomFieldDynamicFilter({})).toBeUndefined();
    expect(buildCustomFieldDynamicFilter(undefined)).toBeUndefined();
  });
});

// A table CELL and a read-only FIELD have OPPOSITE empty conventions, and both
// renderings live in display.ts — these pin the difference so a change to one
// can't quietly adopt the other's convention.
describe('cell text vs read-only field text', () => {
  const parsed = (over: Partial<CustomFieldDef> = {}) =>
    parseCustomField(def(over));

  it('a cell renders empty as BLANK, a field as a dash', () => {
    const text = parsed({ key: 'note' });
    expect(customFieldDisplayString(text, {})).toBe('');
    expect(customFieldFormText(text, {})).toBe(EMPTY_FIELD_VALUE);
    // An empty string is as absent as a missing key.
    expect(customFieldFormText(text, { note: '' })).toBe(EMPTY_FIELD_VALUE);
  });

  // Asserted as dictionary KEYS: with no catalogue loaded under test, t()
  // resolves to the key, so this pins which key each state uses (the point of
  // the test) without pinning the English copy.
  it('a field renders a boolean as Yes/No, distinguishing false from unset', () => {
    const flag = parsed({ key: 'flag', valueType: 'BOOLEAN' });
    expect(customFieldFormText(flag, { flag: true })).toBe('messages.yes');
    // false is a real value — NOT the empty mark (the ambiguity a disabled
    // checkbox hides, since an unchecked box means both things).
    expect(customFieldFormText(flag, { flag: false })).toBe('messages.no');
    expect(customFieldFormText(flag, {})).toBe(EMPTY_FIELD_VALUE);
  });

  it('a field resolves an option to its name, and localises numbers', () => {
    const opt = parsed({
      key: 'cat',
      valueType: 'OPTION',
      options: [option({ id: 'o1', name: 'Vaccines' })],
    });
    expect(customFieldFormText(opt, { cat: 'o1' })).toBe('Vaccines');
    const num = parsed({ key: 'qty', valueType: 'INTEGER' });
    expect(customFieldFormText(num, { qty: 3000 })).toBe('3,000');
    // Zero is a real value, not emptiness.
    expect(customFieldFormText(num, { qty: 0 })).toBe('0');
  });
});
