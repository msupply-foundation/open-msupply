import { PropertyNodeValueTypeV2 } from '@common/types';
import {
  buildPropertyColumns,
  buildPropertyFilterDefinitions,
  buildPropertyUrlFilterConfigs,
  mapPropertyFilters,
  propertyUrlParam,
  PropertyV2ListDefinition,
} from './propertyListSupport';

const def = (
  overrides: Partial<PropertyV2ListDefinition>
): PropertyV2ListDefinition => ({
  key: 'key',
  name: 'Name',
  valueType: PropertyNodeValueTypeV2.Text,
  options: [],
  ...overrides,
});

const text = def({ key: 'note', name: 'Note' });
const option = def({
  key: 'category',
  name: 'Category',
  valueType: PropertyNodeValueTypeV2.Option,
  options: [
    { id: 'parent', name: 'Parent' },
    { id: 'leaf_1', name: 'Leaf 1', parentOptionId: 'parent' },
    { id: 'leaf_2', name: 'Leaf 2', parentOptionId: 'parent' },
  ],
});
const number = def({
  key: 'population',
  name: 'Population',
  valueType: PropertyNodeValueTypeV2.Number,
});
const date = def({
  key: 'opened',
  name: 'Opened',
  valueType: PropertyNodeValueTypeV2.Date,
});
const boolean = def({
  key: 'active',
  name: 'Active',
  valueType: PropertyNodeValueTypeV2.Boolean,
});
const other = def({
  key: 'mystery',
  name: 'Mystery',
  valueType: PropertyNodeValueTypeV2.Other,
});

const rangeLabels = {
  min: 'Min',
  max: 'Max',
  fromDate: 'From date',
  toDate: 'To date',
};

describe('buildPropertyFilterDefinitions', () => {
  it('builds one definition per property by value type', () => {
    const definitions = buildPropertyFilterDefinitions(
      [text, option, number, date, boolean],
      rangeLabels
    );

    expect(definitions).toEqual([
      { type: 'text', name: 'Note', urlParameter: 'prop-note' },
      {
        type: 'enum',
        name: 'Category',
        urlParameter: 'prop-category',
        // leaves only — the parent is not selectable
        options: [
          { label: 'Leaf 1', value: 'leaf_1' },
          { label: 'Leaf 2', value: 'leaf_2' },
        ],
      },
      {
        type: 'group',
        name: 'Population',
        elements: [
          {
            type: 'number',
            name: 'Population (Min)',
            urlParameter: 'prop-population',
            range: 'from',
          },
          {
            type: 'number',
            name: 'Population (Max)',
            urlParameter: 'prop-population',
            range: 'to',
          },
        ],
      },
      {
        type: 'group',
        name: 'Opened',
        elements: [
          {
            type: 'date',
            name: 'Opened (From date)',
            urlParameter: 'prop-opened',
            range: 'from',
          },
          {
            type: 'date',
            name: 'Opened (To date)',
            urlParameter: 'prop-opened',
            range: 'to',
          },
        ],
      },
      { type: 'boolean', name: 'Active', urlParameter: 'prop-active' },
    ]);
  });

  it('skips properties with an unknown value type', () => {
    expect(buildPropertyFilterDefinitions([other], rangeLabels)).toEqual([]);
  });
});

describe('buildPropertyUrlFilterConfigs', () => {
  it('maps value types to url filter conditions', () => {
    expect(
      buildPropertyUrlFilterConfigs([
        text,
        option,
        number,
        date,
        boolean,
        other,
      ])
    ).toEqual([
      { key: 'prop-note' },
      { key: 'prop-category', condition: 'equalTo' },
      { key: 'prop-population', condition: 'between' },
      { key: 'prop-opened', condition: 'between' },
      { key: 'prop-active', condition: '=' },
    ]);
  });
});

describe('mapPropertyFilters', () => {
  const properties = [text, option, number, date, boolean];

  it('passes through when there are no property entries', () => {
    const filterBy = { firstName: { like: 'jo' } };
    expect(mapPropertyFilters(filterBy, properties)).toEqual(filterBy);
  });

  it('strips property entries and builds the condition AST', () => {
    const result = mapPropertyFilters(
      {
        firstName: { like: 'jo' },
        [propertyUrlParam('note')]: { like: 'abc' },
        [propertyUrlParam('category')]: { equalTo: 'leaf_1' },
        // between entries arrive as strings (the url params skip parsing)
        [propertyUrlParam('population')]: {
          afterOrEqualTo: '100',
          beforeOrEqualTo: '500',
        },
        [propertyUrlParam('opened')]: {
          afterOrEqualTo: '2024-01-01',
          beforeOrEqualTo: null,
        },
        [propertyUrlParam('active')]: true,
      },
      properties
    );

    expect(result).toEqual({
      firstName: { like: 'jo' },
      dynamicFilter: {
        And: [
          { Property: { key: 'note', filter: { Text: { Like: 'abc' } } } },
          {
            Property: {
              key: 'category',
              filter: { Option: { Equal: 'leaf_1' } },
            },
          },
          {
            Property: {
              key: 'population',
              filter: { Number: { GreaterThanOrEqual: 100 } },
            },
          },
          {
            Property: {
              key: 'population',
              filter: { Number: { LowerThanOrEqual: 500 } },
            },
          },
          {
            Property: {
              key: 'opened',
              filter: { Date: { GreaterThanOrEqual: '2024-01-01' } },
            },
          },
          { Property: { key: 'active', filter: { Boolean: { Equal: true } } } },
        ],
      },
    });
  });

  it('sends a single condition without an And wrapper', () => {
    expect(
      mapPropertyFilters(
        { [propertyUrlParam('note')]: { like: 'abc' } },
        properties
      )
    ).toEqual({
      dynamicFilter: {
        Property: { key: 'note', filter: { Text: { Like: 'abc' } } },
      },
    });
  });

  it('ignores property entries without a matching definition', () => {
    expect(
      mapPropertyFilters({ 'prop-unknown': { like: 'x' } }, properties)
    ).toEqual(null);
  });
});

describe('buildPropertyColumns', () => {
  const localisedDate = (d: Date) => d.toISOString().slice(0, 10);

  it('builds non-sortable columns that read and format propertiesV2 values', () => {
    const columns = buildPropertyColumns([option, boolean], localisedDate);

    expect(columns.map(c => ({ id: c.id, header: c.header }))).toEqual([
      { id: 'prop-category', header: 'Category' },
      { id: 'prop-active', header: 'Active' },
    ]);
    expect(columns.every(c => c.enableSorting === false)).toBe(true);

    const row = { propertiesV2: { category: 'leaf_1', active: true } };
    // OPTION ids resolve to option names
    expect(columns[0]?.accessorFn?.(row)).toBe('Leaf 1');
    // BOOLEAN passes the raw value to the boolean column renderer
    expect(columns[1]?.accessorFn?.(row)).toBe(true);
  });

  it('renders empty for rows without properties', () => {
    const columns = buildPropertyColumns([text], localisedDate);
    expect(columns[0]?.accessorFn?.({ propertiesV2: null })).toBe('');
  });
});
