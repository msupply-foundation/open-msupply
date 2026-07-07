import { CustomFieldNodeValueType } from '@common/types';
import {
  formatCustomFieldValue,
  getHierarchicalOptions,
  getOptionAndDescendantIds,
  getSelectableOptions,
  getVisiblePropertyRows,
  resolveOptionValue,
  CustomFieldDefinitionLike,
} from './customFields';

const def = (
  overrides: Partial<CustomFieldDefinitionLike> & { key?: string; id?: string }
) => ({
  id: 'id',
  key: 'key',
  valueType: CustomFieldNodeValueType.Text,
  options: [],
  ...overrides,
});

const option = (id: string, name: string) => ({ id, name });

describe('resolveOptionValue', () => {
  const definition = def({
    valueType: CustomFieldNodeValueType.Option,
    options: [option('opt_1', 'Red'), option('opt_2', 'Blue')],
  });

  it('resolves an option id to its display name', () => {
    expect(resolveOptionValue(definition, 'opt_1')).toBe('Red');
  });

  it('shows nothing for an unknown option id (e.g. a category deleted in OG before migration) rather than leaking the raw id', () => {
    expect(resolveOptionValue(definition, 'opt_missing')).toBe('');
  });

  it('joins an array of option ids', () => {
    expect(resolveOptionValue(definition, ['opt_1', 'opt_2'])).toBe('Red, Blue');
  });

  it('drops unresolvable ids from an array so a missing id leaves no stray comma', () => {
    expect(resolveOptionValue(definition, ['opt_1', 'opt_missing', 'opt_2'])).toBe(
      'Red, Blue'
    );
  });
});

describe('getSelectableOptions', () => {
  const withParent = (id: string, name: string, parentOptionId?: string) => ({
    id,
    name,
    parentOptionId,
  });

  it('returns every option for a flat dimension (no parents)', () => {
    const definition = def({
      valueType: CustomFieldNodeValueType.Option,
      options: [option('a', 'A'), option('b', 'B')],
    });
    expect(getSelectableOptions(definition).map(o => o.id)).toEqual(['a', 'b']);
  });

  it('returns only the leaves of a hierarchy', () => {
    // level1 (root) -> level2 -> leaf; only the leaf is selectable.
    const definition = def({
      valueType: CustomFieldNodeValueType.Option,
      options: [
        withParent('lvl1', 'Level 1'),
        withParent('lvl2', 'Level 2', 'lvl1'),
        withParent('leaf', 'Leaf', 'lvl2'),
      ],
    });
    expect(getSelectableOptions(definition).map(o => o.id)).toEqual(['leaf']);
  });

  it('keeps sibling leaves under the same parent', () => {
    const definition = def({
      valueType: CustomFieldNodeValueType.Option,
      options: [
        withParent('p', 'Parent'),
        withParent('c1', 'Child 1', 'p'),
        withParent('c2', 'Child 2', 'p'),
      ],
    });
    expect(getSelectableOptions(definition).map(o => o.id)).toEqual(['c1', 'c2']);
  });
});

describe('getHierarchicalOptions', () => {
  it('flattens a hierarchy in display order with depth and leaf flags', () => {
    // level1 (root) -> level2 -> leaf, plus a sibling leaf under level2.
    const hierarchy = def({
      valueType: CustomFieldNodeValueType.Option,
      options: [
        { id: 'lvl1', name: 'Level 1' },
        { id: 'lvl2', name: 'Level 2', parentOptionId: 'lvl1' },
        { id: 'leafA', name: 'Leaf A', parentOptionId: 'lvl2' },
        { id: 'leafB', name: 'Leaf B', parentOptionId: 'lvl2' },
      ],
    });
    expect(
      getHierarchicalOptions(hierarchy).map(o => [o.id, o.depth, o.isLeaf])
    ).toEqual([
      ['lvl1', 0, false],
      ['lvl2', 1, false],
      ['leafA', 2, true],
      ['leafB', 2, true],
    ]);
  });

  it('returns a flat depth-0 list of leaves for a flat dimension', () => {
    const flat = def({
      valueType: CustomFieldNodeValueType.Option,
      options: [option('a', 'A'), option('b', 'B')],
    });
    expect(
      getHierarchicalOptions(flat).map(o => [o.id, o.depth, o.isLeaf])
    ).toEqual([
      ['a', 0, true],
      ['b', 0, true],
    ]);
  });

  it('treats an orphan (missing parent) as a root', () => {
    const orphan = def({
      valueType: CustomFieldNodeValueType.Option,
      options: [{ id: 'x', name: 'X', parentOptionId: 'gone' }],
    });
    expect(getHierarchicalOptions(orphan).map(o => [o.id, o.depth])).toEqual([
      ['x', 0],
    ]);
  });

  it('does not loop on a cyclic parent reference', () => {
    const cyclic = def({
      valueType: CustomFieldNodeValueType.Option,
      options: [
        { id: 'x', name: 'X', parentOptionId: 'y' },
        { id: 'y', name: 'Y', parentOptionId: 'x' },
      ],
    });
    // Both are mutual parents, so neither is a root → nothing is visited.
    expect(getHierarchicalOptions(cyclic)).toEqual([]);
  });
});

describe('getOptionAndDescendantIds', () => {
  const hierarchy = def({
    valueType: CustomFieldNodeValueType.Option,
    options: [
      { id: 'lvl1', name: 'Level 1' },
      { id: 'lvl2', name: 'Level 2', parentOptionId: 'lvl1' },
      { id: 'leafA', name: 'Leaf A', parentOptionId: 'lvl2' },
      { id: 'leafB', name: 'Leaf B', parentOptionId: 'lvl2' },
      { id: 'other', name: 'Other root' },
    ],
  });

  it('returns the id plus all descendants, including intermediate levels', () => {
    expect(getOptionAndDescendantIds(hierarchy, 'lvl1')).toEqual([
      'lvl1',
      'lvl2',
      'leafA',
      'leafB',
    ]);
    expect(getOptionAndDescendantIds(hierarchy, 'lvl2')).toEqual([
      'lvl2',
      'leafA',
      'leafB',
    ]);
  });

  it('returns just the id for a leaf or an unknown id', () => {
    expect(getOptionAndDescendantIds(hierarchy, 'leafA')).toEqual(['leafA']);
    expect(getOptionAndDescendantIds(hierarchy, 'missing')).toEqual([
      'missing',
    ]);
  });

  it('does not loop on a cyclic parent reference', () => {
    const cyclic = def({
      valueType: CustomFieldNodeValueType.Option,
      options: [
        { id: 'x', name: 'X', parentOptionId: 'y' },
        { id: 'y', name: 'Y', parentOptionId: 'x' },
      ],
    });
    expect(getOptionAndDescendantIds(cyclic, 'x')).toEqual(['x', 'y']);
  });
});

// Mirrors the real localisedDate (date-fns format), which renders the Date's
// *local* date parts — a toISOString-based stub reads UTC parts instead and
// would mask local-midnight vs UTC-midnight off-by-one-day bugs.
const localisedDate = (d: Date) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');

describe('formatCustomFieldValue', () => {
  it('stringifies text/number/real values', () => {
    expect(formatCustomFieldValue(def({}), 'hello', localisedDate)).toBe('hello');
    expect(
      formatCustomFieldValue(
        def({ valueType: CustomFieldNodeValueType.Real }),
        12.5,
        localisedDate
      )
    ).toBe('12.5');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatCustomFieldValue(def({}), null, localisedDate)).toBe('');
    expect(formatCustomFieldValue(def({}), undefined, localisedDate)).toBe('');
  });

  it('localises parseable DATE values, passes through unparseable ones', () => {
    const dateDef = def({ valueType: CustomFieldNodeValueType.Date });
    expect(formatCustomFieldValue(dateDef, '2024-03-15', localisedDate)).toBe(
      '2024-03-15'
    );
    expect(formatCustomFieldValue(dateDef, 'not-a-date', localisedDate)).toBe(
      'not-a-date'
    );
  });

  it('resolves OPTION values via the definition options', () => {
    const optDef = def({
      valueType: CustomFieldNodeValueType.Option,
      options: [option('opt_1', 'Red')],
    });
    expect(formatCustomFieldValue(optDef, 'opt_1', localisedDate)).toBe('Red');
  });
});

describe('formatCustomFieldValue DATE values west of GMT', () => {
  // Emulate a machine in a negative-offset zone — jest workers copy
  // process.env, so setting TZ at runtime never reaches V8. getNaiveDate
  // resolves the machine zone via Intl.DateTimeFormat().resolvedOptions()
  // .timeZone, so mock that, and render via the same zone as the real
  // localisedDate would on such a machine.
  const timeZone = 'America/Chicago';

  beforeAll(() => {
    const defaults = new Intl.DateTimeFormat().resolvedOptions();
    jest
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockImplementation(() => ({ ...defaults, timeZone }));
  });
  afterAll(() => jest.restoreAllMocks());

  const chicagoLocalisedDate = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);

  it('renders the stored calendar date, not the previous day', () => {
    // `new Date('2024-03-15')` is UTC midnight — still 2024-03-14 in Chicago —
    // so the parse must yield local midnight to keep the calendar date the
    // user entered.
    const dateDef = def({ valueType: CustomFieldNodeValueType.Date });
    expect(
      formatCustomFieldValue(dateDef, '2024-03-15', chicagoLocalisedDate)
    ).toBe('2024-03-15');
  });
});

describe('getVisiblePropertyRows', () => {
  const definitions = [
    def({ id: 'a', key: 'fieldOne' }),
    def({ id: 'b', key: 'fieldTwo' }),
    def({ id: 'c', key: 'fieldThree' }),
  ];

  it('returns only definitions that have a value present', () => {
    const rows = getVisiblePropertyRows(definitions, { fieldTwo: 'x' });
    expect(rows.map(r => r.id)).toEqual(['b']);
  });

  it('preserves definition order regardless of value key order', () => {
    const rows = getVisiblePropertyRows(definitions, {
      fieldThree: 'z',
      fieldOne: 'x',
    });
    expect(rows.map(r => r.id)).toEqual(['a', 'c']);
  });

  it('includes keys whose value is explicitly null (present but empty)', () => {
    const rows = getVisiblePropertyRows(definitions, { fieldOne: null });
    expect(rows.map(r => r.id)).toEqual(['a']);
  });
});
