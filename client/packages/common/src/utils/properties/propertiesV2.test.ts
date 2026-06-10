import { PropertyNodeValueTypeV2 } from '@common/types';
import {
  formatPropertyV2Value,
  getHierarchicalOptions,
  getSelectableOptions,
  getVisiblePropertyRows,
  resolveOptionValue,
  PropertyV2DefinitionLike,
} from './propertiesV2';

const def = (
  overrides: Partial<PropertyV2DefinitionLike> & { key?: string; id?: string }
) => ({
  id: 'id',
  key: 'key',
  valueType: PropertyNodeValueTypeV2.Text,
  options: [],
  ...overrides,
});

const option = (id: string, name: string) => ({ id, name });

describe('resolveOptionValue', () => {
  const definition = def({
    valueType: PropertyNodeValueTypeV2.Option,
    options: [option('opt_1', 'Red'), option('opt_2', 'Blue')],
  });

  it('resolves an option id to its display name', () => {
    expect(resolveOptionValue(definition, 'opt_1')).toBe('Red');
  });

  it('falls back to the raw value for an unknown option id', () => {
    expect(resolveOptionValue(definition, 'opt_missing')).toBe('opt_missing');
  });

  it('joins an array of option ids', () => {
    expect(resolveOptionValue(definition, ['opt_1', 'opt_2'])).toBe('Red, Blue');
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
      valueType: PropertyNodeValueTypeV2.Option,
      options: [option('a', 'A'), option('b', 'B')],
    });
    expect(getSelectableOptions(definition).map(o => o.id)).toEqual(['a', 'b']);
  });

  it('returns only the leaves of a hierarchy', () => {
    // level1 (root) -> level2 -> leaf; only the leaf is selectable.
    const definition = def({
      valueType: PropertyNodeValueTypeV2.Option,
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
      valueType: PropertyNodeValueTypeV2.Option,
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
      valueType: PropertyNodeValueTypeV2.Option,
      options: [
        { id: 'lvl1', name: 'Level 1' },
        { id: 'lvl2', name: 'Level 2', parentOptionId: 'lvl1' },
        { id: 'leafA', name: 'Leaf A', parentOptionId: 'lvl2' },
        { id: 'leafB', name: 'Leaf B', parentOptionId: 'lvl2' },
      ],
    });
    expect(
      getHierarchicalOptions(hierarchy).map(o => [o.id, o.depth, o.selectable])
    ).toEqual([
      ['lvl1', 0, false],
      ['lvl2', 1, false],
      ['leafA', 2, true],
      ['leafB', 2, true],
    ]);
  });

  it('returns a flat depth-0 list (all selectable) for a flat dimension', () => {
    const flat = def({
      valueType: PropertyNodeValueTypeV2.Option,
      options: [option('a', 'A'), option('b', 'B')],
    });
    expect(
      getHierarchicalOptions(flat).map(o => [o.id, o.depth, o.selectable])
    ).toEqual([
      ['a', 0, true],
      ['b', 0, true],
    ]);
  });

  it('treats an orphan (missing parent) as a root', () => {
    const orphan = def({
      valueType: PropertyNodeValueTypeV2.Option,
      options: [{ id: 'x', name: 'X', parentOptionId: 'gone' }],
    });
    expect(getHierarchicalOptions(orphan).map(o => [o.id, o.depth])).toEqual([
      ['x', 0],
    ]);
  });

  it('does not loop on a cyclic parent reference', () => {
    const cyclic = def({
      valueType: PropertyNodeValueTypeV2.Option,
      options: [
        { id: 'x', name: 'X', parentOptionId: 'y' },
        { id: 'y', name: 'Y', parentOptionId: 'x' },
      ],
    });
    // Both are mutual parents, so neither is a root → nothing is visited.
    expect(getHierarchicalOptions(cyclic)).toEqual([]);
  });
});

describe('formatPropertyV2Value', () => {
  const localisedDate = (d: Date) => d.toISOString().slice(0, 10);

  it('stringifies text/number/real values', () => {
    expect(formatPropertyV2Value(def({}), 'hello', localisedDate)).toBe('hello');
    expect(
      formatPropertyV2Value(
        def({ valueType: PropertyNodeValueTypeV2.Real }),
        12.5,
        localisedDate
      )
    ).toBe('12.5');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatPropertyV2Value(def({}), null, localisedDate)).toBe('');
    expect(formatPropertyV2Value(def({}), undefined, localisedDate)).toBe('');
  });

  it('localises parseable DATE values, passes through unparseable ones', () => {
    const dateDef = def({ valueType: PropertyNodeValueTypeV2.Date });
    expect(formatPropertyV2Value(dateDef, '2024-03-15', localisedDate)).toBe(
      '2024-03-15'
    );
    expect(formatPropertyV2Value(dateDef, 'not-a-date', localisedDate)).toBe(
      'not-a-date'
    );
  });

  it('resolves OPTION values via the definition options', () => {
    const optDef = def({
      valueType: PropertyNodeValueTypeV2.Option,
      options: [option('opt_1', 'Red')],
    });
    expect(formatPropertyV2Value(optDef, 'opt_1', localisedDate)).toBe('Red');
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
