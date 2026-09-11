import { describe, expect, it } from 'vitest';
import {
  ancestorIds,
  applyOptionToggle,
  collapseSelectionToStored,
  expandStoredToSelection,
  filterQueryIds,
  liveOptions,
  multiOptionIds,
  optionAndDescendantIds,
  orderOptionsHierarchically,
  parseCustomField,
  parseCustomFields,
  partitionCustomFields,
  shownCustomFields,
  topMostIds,
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
  deletedDatetime: null,
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
    expect(parseCustomField(def({ valueType: 'MULTI_OPTION' })).kind).toBe(
      'multiOption'
    );
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

// MULTI_OPTION stores the MINIMAL covering set — a parent stands for its whole
// subtree — while the picker works in the expanded set. These pin the round
// trip between the two, since every surface depends on it: what displays, what
// is stored, and what the filter asks the server.
describe('deleted options: resolvable, never offered', () => {
  // The server returns deleted options deliberately (a stored value is only an
  // id), so the split has to be enforced client-side.
  const def = (): CustomFieldDef =>
    ({
      id: 'cf',
      key: 'k',
      name: 'Field',
      valueType: 'OPTION',
      kind: 'STANDARD',
      displayMode: 'VISIBLE',
      options: [
        option({ id: 'live', name: 'Live' }),
        option({ id: 'gone', name: 'Gone', deletedDatetime: '2026-01-01T00:00:00' }),
      ],
    }) as CustomFieldDef;

  it('drops deleted options from the offered list', () => {
    expect(liveOptions(def().options).map(o => o.id)).toEqual(['live']);
  });

  it('keeps them out of what a picker renders', () => {
    const parsed = parseCustomField(def());
    expect(
      parsed.kind === 'option' ? parsed.options.map(o => o.option.id) : []
    ).toEqual(['live']);
  });

  it('still resolves a stored deleted id to its name, not a raw id', () => {
    expect(
      customFieldDisplayString(parseCustomField(def()), { k: 'gone' })
    ).toBe('Gone');
  });
});

describe('multi-option: the minimal covering set', () => {
  const options = [
    option({ id: 'root', parentOptionId: null }),
    option({ id: 'child', parentOptionId: 'root' }),
    option({ id: 'sibling', parentOptionId: 'root' }),
    option({ id: 'grandchild', parentOptionId: 'child' }),
    option({ id: 'flat', parentOptionId: null }),
  ];

  it('reads only an array of strings as a value', () => {
    expect(multiOptionIds(['a', 'b'])).toEqual(['a', 'b']);
    expect(multiOptionIds([])).toEqual([]);
    // A scalar is what a field retyped from OPTION leaves behind; a mixed
    // array is not this field's value either.
    expect(multiOptionIds('a')).toEqual([]);
    expect(multiOptionIds(['a', 2])).toEqual([]);
    expect(multiOptionIds(null)).toEqual([]);
  });

  it('expands a stored parent to every node beneath it', () => {
    expect(expandStoredToSelection(options, ['child']).sort()).toEqual([
      'child',
      'grandchild',
    ]);
    expect(expandStoredToSelection(options, ['flat'])).toEqual(['flat']);
  });

  it('collapses a fully ticked subtree back to its parent', () => {
    expect(
      collapseSelectionToStored(options, [
        'root',
        'child',
        'sibling',
        'grandchild',
      ])
    ).toEqual(['root']);
    // A partially ticked parent stores its ticked children, in configured
    // order rather than tick order.
    expect(collapseSelectionToStored(options, ['flat', 'sibling'])).toEqual([
      'sibling',
      'flat',
    ]);
  });

  it('survives the round trip, and keeps an id the definition does not know', () => {
    const stored = ['child', 'flat'];
    expect(
      collapseSelectionToStored(
        options,
        expandStoredToSelection(options, stored)
      )
    ).toEqual(stored);
    expect(topMostIds(options, ['ghost'])).toEqual(['ghost']);
  });

  it('ticking a node takes its subtree; unticking one takes its ancestors', () => {
    // Ticking `child` also ticks `grandchild` …
    expect(applyOptionToggle(options, [], ['child']).sort()).toEqual([
      'child',
      'grandchild',
    ]);
    // … and unticking `grandchild` releases `child`, which is no longer fully
    // selected, while leaving a sibling selection alone.
    expect(
      applyOptionToggle(
        options,
        ['root', 'child', 'grandchild', 'sibling'],
        ['root', 'child', 'sibling']
      ).sort()
    ).toEqual(['sibling']);
  });

  it('expands a filter both ways so minimal storage still matches', () => {
    // Down: filtering on `root` finds a record stored as `grandchild`.
    // Up: filtering on `grandchild` finds a record stored, minimally, as
    // `root`.
    expect(filterQueryIds(options, ['grandchild']).sort()).toEqual([
      'child',
      'grandchild',
      'root',
    ]);
    expect(filterQueryIds(options, ['root']).sort()).toEqual([
      'child',
      'grandchild',
      'root',
      'sibling',
    ]);
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

  it('expands a MULTI_OPTION condition against the definition it is given', () => {
    const options = [
      option({ id: 'root', parentOptionId: null }),
      option({ id: 'child', parentOptionId: 'root' }),
    ];
    const category = def({
      key: 'category',
      valueType: 'MULTI_OPTION',
      options,
    });
    expect(
      buildCustomFieldDynamicFilter(
        { category: { kind: 'multiOption', optionIds: ['child'] } },
        [category]
      )
    ).toEqual({
      And: [
        {
          CustomField: {
            key: 'category',
            filter: { MultiOption: { In: ['child', 'root'] } },
          },
        },
      ],
    });
    // Without the definition there is no tree to walk: the chosen ids stand as
    // they are — a narrower filter, never a wrong one.
    expect(
      buildCustomFieldDynamicFilter({
        category: { kind: 'multiOption', optionIds: ['child'] },
      })
    ).toEqual({
      And: [
        {
          CustomField: {
            key: 'category',
            filter: { MultiOption: { In: ['child'] } },
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

  it('a multi-option reads as its names, a stored parent as the parent', () => {
    const cat = parsed({
      key: 'cat',
      valueType: 'MULTI_OPTION',
      options: [
        option({ id: 'root', name: 'Vulnerable' }),
        option({ id: 'child', name: 'Under-5', parentOptionId: 'root' }),
        option({ id: 'flat', name: 'Pregnant' }),
      ],
    });
    // Configured order, comma-space joined — not tick order.
    expect(customFieldDisplayString(cat, { cat: ['flat', 'child'] })).toBe(
      'Under-5, Pregnant'
    );
    // A stored parent stands for its subtree and reads as the parent: the
    // shorter true statement, and one that doesn't rewrite itself when an
    // option is added beneath it. A non-minimal value reads the same way.
    expect(customFieldDisplayString(cat, { cat: ['root'] })).toBe('Vulnerable');
    expect(customFieldDisplayString(cat, { cat: ['root', 'child'] })).toBe(
      'Vulnerable'
    );
    // An empty selection is emptiness, in each surface's own convention.
    expect(customFieldDisplayString(cat, { cat: [] })).toBe('');
    expect(customFieldFormText(cat, { cat: [] })).toBe(EMPTY_FIELD_VALUE);
  });

  it('shows nothing for a value whose shape is not what its type means', () => {
    // What a definition retyped on central leaves behind, and what the server
    // now refuses to write: a bare id under a multi-valued field, a list under
    // a single-valued one, a number under text.
    const multi = parsed({
      key: 'cat',
      valueType: 'MULTI_OPTION',
      options: [option({ id: 'o1', name: 'Pregnant' })],
    });
    expect(customFieldDisplayString(multi, { cat: 'o1' })).toBe('');
    expect(customFieldFormText(multi, { cat: 'o1' })).toBe(EMPTY_FIELD_VALUE);
    const single = parsed({
      key: 'cat',
      valueType: 'OPTION',
      options: [option({ id: 'o1', name: 'Pregnant' })],
    });
    expect(customFieldFormText(single, { cat: ['o1'] })).toBe(
      EMPTY_FIELD_VALUE
    );
    const text = parsed({ key: 'note' });
    expect(customFieldDisplayString(text, { note: 42 })).toBe('');
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
