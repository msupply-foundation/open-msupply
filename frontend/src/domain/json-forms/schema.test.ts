import { describe, expect, it } from 'vitest';
import {
  cleanArguments,
  parseArgumentSchema,
  seedDefaults,
  type ParsedField,
} from './schema';

// The real item-list report schema shape (the ItemListFilters form), embedded
// as the fixture. jsonSchema is draft-07 with the top-level `allOf` + `$ref` +
// `definitions` layering the real backend emits; uiSchema is the flat element
// list. Covers every property/control shape the interpreter must handle:
// text (nullable), master-list picker, boolean with `invert`, plain boolean,
// enum with `show` labels, enum from raw values, and a SortToggle.
const itemListJsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  allOf: [{ $ref: '#/definitions/ItemListFilters' }],
  definitions: {
    ItemListFilters: {
      type: 'object',
      properties: {
        itemCode: { type: ['string', 'null'] },
        itemName: { type: ['string', 'null'] },
        masterListId: { type: ['string', 'null'] },
        isActive: { type: ['boolean', 'null'], default: true },
        onlyOutOfStock: { type: 'boolean', default: false },
        venCategory: { enum: ['V', 'E', 'N'], type: ['string', 'null'] },
        sort: { enum: ['name', 'code', 'stockOnHand'], type: 'string' },
        dir: { format: 'SortToggle', enum: ['asc', 'desc'] },
      },
    },
  },
};

const itemListUiSchema = {
  type: 'VerticalLayout',
  elements: [
    { type: 'Control', scope: '#/properties/itemCode', label: 'Item code' },
    { type: 'Control', scope: '#/properties/itemName', label: 'Item name' },
    {
      type: 'MasterListSearch',
      scope: '#/properties/masterListId',
      label: 'Master list',
    },
    {
      type: 'Control',
      scope: '#/properties/isActive',
      label: 'Include inactive items',
      options: { invert: true },
    },
    {
      type: 'Control',
      scope: '#/properties/onlyOutOfStock',
      label: 'Only out of stock',
      options: { useDebounce: false },
    },
    {
      type: 'Control',
      scope: '#/properties/venCategory',
      label: 'VEN category',
      options: {
        show: [
          ['V', 'Vital'],
          ['E', 'Essential'],
          ['N', 'Non-essential'],
        ],
      },
    },
    { type: 'Control', scope: '#/properties/sort', label: 'Sort by' },
    { type: 'SortToggle', scope: '#/properties/dir', label: 'Direction' },
  ],
};

const itemListSchema = {
  jsonSchema: itemListJsonSchema,
  uiSchema: itemListUiSchema,
};

const byKey = (fields: ParsedField[], key: string): ParsedField => {
  const field = fields.find(f => f.key === key);
  if (!field) throw new Error(`no field for ${key}`);
  return field;
};

describe('parseArgumentSchema — item-list shape', () => {
  const fields = parseArgumentSchema(itemListSchema);

  it('preserves uiSchema element order and maps each to a kind', () => {
    expect(fields.map(f => [f.key, f.kind])).toEqual([
      ['itemCode', 'text'],
      ['itemName', 'text'],
      ['masterListId', 'masterList'],
      ['isActive', 'boolean'],
      ['onlyOutOfStock', 'boolean'],
      ['venCategory', 'enum'],
      ['sort', 'enum'],
      ['dir', 'sortToggle'],
    ]);
  });

  it('resolves properties through allOf/$ref/definitions', () => {
    // itemCode only exists under definitions.ItemListFilters.properties; the
    // Control resolving to `text` proves the one-level $ref was followed.
    expect(byKey(fields, 'itemCode')).toEqual({
      kind: 'text',
      key: 'itemCode',
      label: 'Item code',
      nullable: true,
      readOnly: false,
      required: false,
    });
  });

  it('reads a nullable string Control as text', () => {
    const field = byKey(fields, 'itemName');
    if (field.kind !== 'text') throw new Error('expected text');
    expect(field.nullable).toBe(true);
  });

  it('maps custom picker elements to their kinds by element type', () => {
    expect(byKey(fields, 'masterListId')).toEqual({
      kind: 'masterList',
      key: 'masterListId',
      label: 'Master list',
      nullable: true,
    });
    expect(byKey(fields, 'dir')).toEqual({
      kind: 'sortToggle',
      key: 'dir',
      label: 'Direction',
      nullable: false,
    });
  });

  it('maps ProgramSearch with its option flags (AC-R12)', () => {
    const parsed = parseArgumentSchema({
      jsonSchema: {
        properties: {
          programId: { type: 'string' },
          vaccineProgramId: { type: 'string' },
        },
      },
      uiSchema: {
        elements: [
          {
            type: 'ProgramSearch',
            scope: '#/properties/programId',
            label: 'Program',
            options: { allProgramsOption: true },
          },
          {
            type: 'ProgramSearch',
            scope: '#/properties/vaccineProgramId',
            label: 'Vaccine program',
            options: { programType: 'immunisation', clearable: true },
          },
        ],
      },
    });
    expect(parsed[0]).toEqual({
      kind: 'programSearch',
      key: 'programId',
      label: 'Program',
      nullable: false,
      required: false,
      immunisationOnly: false,
      allPrograms: true,
      clearable: false,
    });
    expect(parsed[1]).toEqual({
      kind: 'programSearch',
      key: 'vaccineProgramId',
      label: 'Vaccine program',
      nullable: false,
      required: false,
      immunisationOnly: true,
      allPrograms: false,
      clearable: true,
    });
  });

  it('carries invert on the flagged boolean and not on a plain one', () => {
    const isActive = byKey(fields, 'isActive');
    const onlyOutOfStock = byKey(fields, 'onlyOutOfStock');
    if (isActive.kind !== 'boolean' || onlyOutOfStock.kind !== 'boolean')
      throw new Error('expected boolean fields');
    expect(isActive.invert).toBe(true);
    expect(isActive.default).toBe(true);
    expect(onlyOutOfStock.invert).toBe(false);
    expect(onlyOutOfStock.default).toBe(false);
  });

  it('builds enum options from `show` value/label pairs', () => {
    const field = byKey(fields, 'venCategory');
    if (field.kind !== 'enum') throw new Error('expected enum');
    expect(field.options).toEqual([
      { value: 'V', label: 'Vital' },
      { value: 'E', label: 'Essential' },
      { value: 'N', label: 'Non-essential' },
    ]);
  });

  it('builds enum options from raw values when no `show` is given', () => {
    const field = byKey(fields, 'sort');
    if (field.kind !== 'enum') throw new Error('expected enum');
    expect(field.options).toEqual([
      { value: 'name', label: 'name' },
      { value: 'code', label: 'code' },
      { value: 'stockOnHand', label: 'stockOnHand' },
    ]);
  });
});

describe('parseArgumentSchema — input normalisation', () => {
  it('accepts jsonSchema/uiSchema as JSON strings, not just objects', () => {
    const fromStrings = parseArgumentSchema({
      jsonSchema: JSON.stringify(itemListJsonSchema),
      uiSchema: JSON.stringify(itemListUiSchema),
    });
    expect(fromStrings).toEqual(parseArgumentSchema(itemListSchema));
  });

  it('resolves a plain `{ properties }` schema without allOf/$ref', () => {
    const fields = parseArgumentSchema({
      jsonSchema: { properties: { itemName: { type: 'string' } } },
      uiSchema: {
        elements: [
          { type: 'Control', scope: '#/properties/itemName', label: 'Name' },
        ],
      },
    });
    expect(fields).toEqual([
      {
        kind: 'text',
        key: 'itemName',
        label: 'Name',
        nullable: false,
        readOnly: false,
        required: false,
      },
    ]);
  });

  it('returns no fields for empty or garbage input', () => {
    expect(parseArgumentSchema({ jsonSchema: null, uiSchema: null })).toEqual(
      []
    );
    expect(
      parseArgumentSchema({ jsonSchema: '{bad', uiSchema: '{bad' })
    ).toEqual([]);
  });
});

describe('parseArgumentSchema — unsupported fallback', () => {
  it('degrades an unknown element type, preserving the type name', () => {
    const fields = parseArgumentSchema({
      jsonSchema: { properties: {} },
      uiSchema: {
        elements: [
          {
            type: 'PeriodSearch',
            scope: '#/properties/periodId',
            label: 'Period',
          },
        ],
      },
    });
    expect(fields).toEqual([
      {
        kind: 'unsupported',
        key: 'periodId',
        label: 'Period',
        elementType: 'PeriodSearch',
      },
    ]);
  });

  it('degrades a Control whose jsonSchema property is missing', () => {
    const fields = parseArgumentSchema({
      jsonSchema: { properties: {} },
      uiSchema: {
        elements: [
          { type: 'Control', scope: '#/properties/ghost', label: 'Ghost' },
        ],
      },
    });
    expect(fields).toEqual([
      {
        kind: 'unsupported',
        key: 'ghost',
        label: 'Ghost',
        elementType: 'Control',
      },
    ]);
  });
});

// The expiring-items shape (real backend fixture, abridged): numeric
// preference thresholds marked readOnly, a date-formatted string, and a
// definition-level `required` list (the encounters report's shape).
const stockFiltersSchema = {
  jsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    allOf: [{ $ref: '#/definitions/StockFilters' }],
    definitions: {
      StockFilters: {
        properties: {
          expiryDate: { type: 'string', format: 'date' },
          fromDatetime: { type: 'string', format: 'date-time' },
          monthsItemsExpire: { type: 'number', readOnly: true },
          monthsOverstock: { type: 'number' },
          programId: { type: 'string' },
        },
        required: ['programId'],
      },
    },
  },
  uiSchema: {
    elements: [
      { type: 'Control', scope: '#/properties/expiryDate', label: 'Expiry' },
      { type: 'Control', scope: '#/properties/fromDatetime', label: 'From' },
      {
        type: 'Control',
        scope: '#/properties/monthsItemsExpire',
        label: 'Expiring period',
      },
      {
        type: 'Control',
        scope: '#/properties/monthsOverstock',
        label: 'Months overstock',
      },
      { type: 'Control', scope: '#/properties/programId', label: 'Program' },
    ],
  },
};

describe('parseArgumentSchema — numbers, dates, readOnly, required', () => {
  const fields = parseArgumentSchema(stockFiltersSchema);

  it('maps number properties to the number kind, carrying readOnly', () => {
    expect(byKey(fields, 'monthsItemsExpire')).toEqual({
      kind: 'number',
      key: 'monthsItemsExpire',
      label: 'Expiring period',
      nullable: false,
      readOnly: true,
      required: false,
      default: undefined,
    });
    const editable = byKey(fields, 'monthsOverstock');
    if (editable.kind !== 'number') throw new Error('expected number');
    expect(editable.readOnly).toBe(false);
  });

  it('maps date and date-time formatted strings to the date kind', () => {
    expect(byKey(fields, 'expiryDate')).toEqual({
      kind: 'date',
      key: 'expiryDate',
      label: 'Expiry',
      nullable: false,
      readOnly: false,
      required: false,
      dateTime: false,
    });
    const fromDatetime = byKey(fields, 'fromDatetime');
    if (fromDatetime.kind !== 'date') throw new Error('expected date');
    expect(fromDatetime.dateTime).toBe(true);
  });

  it('reads a definition-level required list through the $ref', () => {
    const programId = byKey(fields, 'programId');
    if (programId.kind !== 'text') throw new Error('expected text');
    expect(programId.required).toBe(true);
  });
});

describe('cleanArguments', () => {
  const fields = parseArgumentSchema(stockFiltersSchema);

  it('strips empty values and coerces number-field text to numbers', () => {
    expect(
      cleanArguments(fields, {
        expiryDate: '2026-07-31',
        monthsOverstock: '6.5',
        monthsItemsExpire: 4, // untouched seed stays a number
        programId: '',
        timezone: 'Pacific/Auckland',
        untouched: undefined,
      })
    ).toEqual({
      expiryDate: '2026-07-31',
      monthsOverstock: 6.5,
      monthsItemsExpire: 4,
      timezone: 'Pacific/Auckland',
    });
  });

  it('drops an unparseable number leftover like an empty', () => {
    expect(cleanArguments(fields, { monthsOverstock: '.' })).toEqual({});
  });
});

// The Pending Encounters shape (real backend fixture, abridged): a required
// `programId` driven by a PatientProgramSearch control, and a single
// `startDatetime` property (type object|null) driven by a DateRange control.
// The editing store holds { start, end } calendar dates under that one key;
// cleanArguments widens them to the wire DatetimeFilterInput.
const dateRangeSchema = {
  jsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    allOf: [{ $ref: '#/definitions/Filters' }],
    definitions: {
      Filters: {
        properties: {
          programId: { type: 'string' },
          startDatetime: { type: ['object', 'null'], format: 'date-time' },
        },
        required: ['programId'],
      },
    },
  },
  uiSchema: {
    elements: [
      {
        type: 'PatientProgramSearch',
        scope: '#/properties/programId',
        label: 'Program',
      },
      {
        type: 'DateRange',
        scope: '#/properties/startDatetime',
        label: '',
        options: { dateOnly: true },
      },
    ],
  },
};

describe('cleanArguments — DateRange', () => {
  const fields = parseArgumentSchema(dateRangeSchema);

  it('parses the DateRange control to the dateRange kind', () => {
    expect(byKey(fields, 'startDatetime').kind).toBe('dateRange');
  });

  it('parses PatientProgramSearch to the program kind, carrying required', () => {
    expect(byKey(fields, 'programId')).toEqual({
      kind: 'program',
      key: 'programId',
      label: 'Program',
      nullable: false,
      required: true,
    });
  });

  it('passes a program context id through untouched on submit', () => {
    expect(cleanArguments(fields, { programId: 'hiv-context' })).toEqual({
      programId: 'hiv-context',
    });
  });

  it('widens both ends to a DatetimeFilterInput (inclusive local day)', () => {
    expect(
      cleanArguments(fields, {
        startDatetime: { start: '2026-07-01', end: '2026-07-31' },
      })
    ).toEqual({
      startDatetime: {
        afterOrEqualTo: new Date('2026-07-01T00:00:00').toISOString(),
        beforeOrEqualTo: new Date('2026-07-31T23:59:59.999').toISOString(),
      },
    });
  });

  it('omits an empty end (or start) rather than sending a blank', () => {
    expect(
      cleanArguments(fields, {
        startDatetime: { start: '2026-07-01', end: '' },
      })
    ).toEqual({
      startDatetime: {
        afterOrEqualTo: new Date('2026-07-01T00:00:00').toISOString(),
      },
    });
  });

  it('drops the key entirely when both ends are empty', () => {
    expect(
      cleanArguments(fields, { startDatetime: { start: '', end: '' } })
    ).toEqual({});
  });
});

describe('seedDefaults', () => {
  const prefs = {
    monthsOverstock: 6,
    monthsUnderstock: 3,
    monthsItemsExpire: 4,
    monthlyConsumptionLookBackPeriod: 12,
  };

  it('seeds the preference keys, timezone, and schema defaults', () => {
    const fields = parseArgumentSchema(itemListSchema);
    const seed = seedDefaults(fields, prefs);

    // Preference seed (the real app's observed URL arguments).
    expect(seed.monthlyConsumptionLookBackPeriod).toBe(12);
    expect(seed.monthsOverstock).toBe(6);
    expect(seed.monthsUnderstock).toBe(3);
    expect(seed.monthsItemsExpire).toBe(4);
    expect(typeof seed.timezone).toBe('string');
    expect((seed.timezone as string).length).toBeGreaterThan(0);

    // Schema defaults (raw values — invert is a display concern only).
    expect(seed.isActive).toBe(true);
    expect(seed.onlyOutOfStock).toBe(false);
  });

  it('does not invent values for schema fields without a default', () => {
    const fields = parseArgumentSchema(itemListSchema);
    const seed = seedDefaults(fields, prefs);
    expect('itemCode' in seed).toBe(false);
    expect('venCategory' in seed).toBe(false);
    expect('sort' in seed).toBe(false);
    expect('dir' in seed).toBe(false);
  });

  it('omits preference keys absent from the prefs object', () => {
    const seed = seedDefaults([], {});
    expect('monthsOverstock' in seed).toBe(false);
    expect('monthlyConsumptionLookBackPeriod' in seed).toBe(false);
    // timezone is always seeded.
    expect(typeof seed.timezone).toBe('string');
  });
});
