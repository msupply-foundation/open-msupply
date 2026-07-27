import { describe, expect, it } from 'vitest';
import {
  cleanArguments,
  dateArgumentDay,
  dateArgumentValue,
  dateFieldBounds,
  dateFieldViolation,
  instantToLocalDate,
  parseArgumentSchema,
  periodSearchWrites,
  scheduleCascadeWrites,
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
            type: 'HologramSearch',
            scope: '#/properties/hologramId',
            label: 'Hologram',
          },
        ],
      },
    });
    expect(fields).toEqual([
      {
        kind: 'unsupported',
        key: 'hologramId',
        label: 'Hologram',
        elementType: 'HologramSearch',
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
      dateOnly: false,
      dateAsEndOfDay: false,
      disableFuture: false,
      minKey: undefined,
      maxKey: undefined,
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

// The five search/cascade controls (AC-R13–R17), shaped like the shipped
// schemas that use them: the standard outbound-shipments NameSearch, the
// Afghanistan stock-delivery-record ItemSearch (with its control-less
// `itemName` companion property), the Niger inventory_adjustments
// ReasonOptionSearch, the standard per-period reports' two PeriodSearch modes,
// and the Congo quarterly requisition's ScheduleForm.
const searchControlsSchema = {
  jsonSchema: {
    type: 'object',
    properties: {
      otherPartyId: { type: ['string', 'null'] },
      itemId: { type: 'string' },
      itemName: { type: 'string' },
      reasonOptionId: { type: ['string', 'null'] },
      periodId: { type: 'string' },
      after: { format: 'date-time', type: 'string' },
      schedule: { type: 'object' },
    },
    required: ['itemId'],
  },
  uiSchema: {
    type: 'VerticalLayout',
    elements: [
      {
        type: 'NameSearch',
        scope: '#/properties/otherPartyId',
        label: 'Customer',
        options: { nameType: 'customer' },
      },
      { type: 'ItemSearch', scope: '#/properties/itemId', label: 'Item' },
      {
        type: 'ReasonOptionSearch',
        scope: '#/properties/reasonOptionId',
        label: 'Reason',
      },
      {
        type: 'PeriodSearch',
        scope: '#/properties/periodId',
        label: 'Period',
        options: { findByProgram: true, clearable: true },
      },
      {
        type: 'PeriodSearch',
        scope: '#/properties/after',
        label: 'Period (span)',
        options: { findByProgram: false },
      },
      {
        type: 'ScheduleForm',
        scope: '#/properties/schedule',
        label: 'Schedule',
      },
    ],
  },
};

describe('parseArgumentSchema — search controls (AC-R13–R17)', () => {
  const fields = parseArgumentSchema(searchControlsSchema);

  it('maps NameSearch with its party role (AC-R13)', () => {
    expect(byKey(fields, 'otherPartyId')).toEqual({
      kind: 'nameSearch',
      key: 'otherPartyId',
      label: 'Customer',
      nullable: true,
      required: false,
      role: 'customer',
    });
  });

  it('degrades a role-less NameSearch to unsupported, not nothing', () => {
    const parsed = parseArgumentSchema({
      jsonSchema: { properties: { otherPartyId: { type: 'string' } } },
      uiSchema: {
        elements: [
          {
            type: 'NameSearch',
            scope: '#/properties/otherPartyId',
            label: 'Party',
          },
        ],
      },
    });
    expect(parsed[0]).toEqual({
      kind: 'unsupported',
      key: 'otherPartyId',
      label: 'Party',
      elementType: 'NameSearch',
    });
  });

  it('maps ItemSearch, carrying required (AC-R14)', () => {
    expect(byKey(fields, 'itemId')).toEqual({
      kind: 'itemSearch',
      key: 'itemId',
      label: 'Item',
      nullable: false,
      required: true,
    });
  });

  it('maps ReasonOptionSearch (AC-R15)', () => {
    expect(byKey(fields, 'reasonOptionId').kind).toBe('reasonOption');
  });

  it('maps both PeriodSearch modes with their option flags (AC-R16)', () => {
    expect(byKey(fields, 'periodId')).toEqual({
      kind: 'periodSearch',
      key: 'periodId',
      label: 'Period',
      nullable: false,
      required: false,
      findByProgram: true,
      clearable: true,
    });
    expect(byKey(fields, 'after')).toMatchObject({
      kind: 'periodSearch',
      findByProgram: false,
      clearable: false,
    });
  });

  it('maps ScheduleForm (AC-R17)', () => {
    expect(byKey(fields, 'schedule')).toEqual({
      kind: 'scheduleForm',
      key: 'schedule',
      label: 'Schedule',
      requiredKeys: [],
    });
  });

  it('collects required cascade keys from the schema, Congo-style (AC-R17)', () => {
    // The Congo quarterly requisition marks after/before/programId required —
    // keys OUTSIDE the element's own scope, but rendered by the cascade, so
    // they gate OK. scheduleId/periodId stay optional there.
    const parsed = parseArgumentSchema({
      jsonSchema: {
        type: 'object',
        properties: { schedule: { type: 'object' } },
        required: ['after', 'before', 'programId'],
      },
      uiSchema: {
        elements: [
          {
            type: 'ScheduleForm',
            scope: '#/properties/schedule',
            label: 'Schedule',
          },
        ],
      },
    });
    expect(parsed[0]).toMatchObject({
      kind: 'scheduleForm',
      requiredKeys: ['programId', 'after', 'before'],
    });
  });
});

describe('periodSearchWrites (AC-R16)', () => {
  const period = {
    id: 'p1',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
  };

  it('writes the id alone when scoped at periodId', () => {
    expect(periodSearchWrites('periodId', period)).toEqual({
      periodId: 'p1',
    });
  });

  it('writes the span — start instant + before companion — at any other key', () => {
    expect(periodSearchWrites('after', period)).toEqual({
      after: new Date('2026-06-01T00:00:00').toISOString(),
      before: new Date('2026-06-30T23:59:59.999').toISOString(),
    });
  });

  it('clears the scoped key and before in both modes', () => {
    expect(periodSearchWrites('periodId', null)).toEqual({
      periodId: undefined,
      before: undefined,
    });
    expect(periodSearchWrites('after', null)).toEqual({
      after: undefined,
      before: undefined,
    });
  });
});

describe('scheduleCascadeWrites (AC-R17)', () => {
  it('a program pick wipes everything downstream', () => {
    expect(scheduleCascadeWrites.program('prog-1')).toEqual({
      programId: 'prog-1',
      scheduleId: undefined,
      periodId: undefined,
      after: undefined,
      before: undefined,
    });
  });

  it('a schedule pick wipes the period and dates', () => {
    expect(scheduleCascadeWrites.schedule('sched-1')).toEqual({
      scheduleId: 'sched-1',
      periodId: undefined,
      after: undefined,
      before: undefined,
    });
  });

  it('a period pick fills the day-widened date bounds', () => {
    expect(
      scheduleCascadeWrites.period({
        id: 'p1',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
      })
    ).toEqual({
      periodId: 'p1',
      after: new Date('2026-04-01T00:00:00').toISOString(),
      before: new Date('2026-06-30T23:59:59.999').toISOString(),
    });
  });

  it('clearing the period removes id and both bounds', () => {
    expect(scheduleCascadeWrites.period(null)).toEqual({
      periodId: undefined,
      after: undefined,
      before: undefined,
    });
  });
});

describe('instantToLocalDate', () => {
  it('round-trips a day-start instant back to its calendar date', () => {
    const instant = new Date('2026-06-01T00:00:00').toISOString();
    expect(instantToLocalDate(instant)).toBe('2026-06-01');
  });

  it('returns empty for absent or garbled values', () => {
    expect(instantToLocalDate(undefined)).toBe('');
    expect(instantToLocalDate('')).toBe('');
    expect(instantToLocalDate('not-a-date')).toBe('');
  });
});

// The customer-returns shape (AC-R18): date-time properties whose elements ask
// for date-only entry, end-of-day widening on the "to" bound, no-future, and
// live sibling min/max scope refs — the exact options the standard shipments /
// returns / adjustments / encounters schemas carry.
const dateOptionsSchema = {
  jsonSchema: {
    type: 'object',
    properties: {
      after: { type: 'string', format: 'date-time' },
      before: { type: 'string', format: 'date-time' },
      plainDay: { type: 'string', format: 'date' },
    },
  },
  uiSchema: {
    elements: [
      {
        type: 'Control',
        scope: '#/properties/after',
        label: 'From date',
        options: {
          dateOnly: true,
          disableFuture: true,
          max: '#/properties/before',
        },
      },
      {
        type: 'Control',
        scope: '#/properties/before',
        label: 'To date',
        options: {
          dateOnly: true,
          disableFuture: true,
          min: '#/properties/after',
          dateAsEndOfDay: true,
        },
      },
      { type: 'Control', scope: '#/properties/plainDay', label: 'Plain' },
    ],
  },
};

describe('date options (AC-R18)', () => {
  const fields = parseArgumentSchema(dateOptionsSchema);
  const dateByKey = (key: string) => {
    const field = byKey(fields, key);
    if (field.kind !== 'date') throw new Error('expected date');
    return field;
  };
  const after = dateByKey('after');
  const before = dateByKey('before');
  const plain = dateByKey('plainDay');

  it('parses dateOnly / dateAsEndOfDay / disableFuture / sibling bound refs', () => {
    expect(after).toMatchObject({
      dateTime: true,
      dateOnly: true,
      dateAsEndOfDay: false,
      disableFuture: true,
      minKey: undefined,
      maxKey: 'before',
    });
    expect(before).toMatchObject({
      dateTime: true,
      dateOnly: true,
      dateAsEndOfDay: true,
      disableFuture: true,
      minKey: 'after',
      maxKey: undefined,
    });
  });

  it('defaults every option off for an element without them', () => {
    expect(plain).toMatchObject({
      dateTime: false,
      dateOnly: false,
      dateAsEndOfDay: false,
      disableFuture: false,
      minKey: undefined,
      maxKey: undefined,
    });
  });

  it('widens a picked day to a start-of-day instant', () => {
    expect(dateArgumentValue(after, '2026-06-01')).toBe(
      new Date('2026-06-01T00:00:00').toISOString()
    );
  });

  it('widens the end-of-day field to the inclusive last instant', () => {
    expect(dateArgumentValue(before, '2026-06-30')).toBe(
      new Date('2026-06-30T23:59:59.999').toISOString()
    );
  });

  it('passes a plain date field value through as the calendar day', () => {
    expect(dateArgumentValue(plain, '2026-06-01')).toBe('2026-06-01');
  });

  it('reads a stored instant back as the local day it fell on', () => {
    const stored = new Date('2026-06-30T23:59:59.999').toISOString();
    expect(dateArgumentDay(stored)).toBe('2026-06-30');
    expect(dateArgumentDay('2026-06-01')).toBe('2026-06-01');
    expect(dateArgumentDay(undefined)).toBe('');
  });

  it('resolves the max bound live from the sibling instant value', () => {
    const values = {
      before: new Date('2026-06-15T23:59:59.999').toISOString(),
    };
    expect(dateFieldBounds(after, values, '2026-07-27')).toEqual({
      max: '2026-06-15',
    });
  });

  it('tightens the ceiling to today when the sibling bound is later', () => {
    const values = {
      before: new Date('2026-12-31T23:59:59.999').toISOString(),
    };
    expect(dateFieldBounds(after, values, '2026-07-27')).toEqual({
      max: '2026-07-27',
    });
  });

  it('caps at today with no sibling bound set (disableFuture)', () => {
    expect(dateFieldBounds(after, {}, '2026-07-27')).toEqual({
      max: '2026-07-27',
    });
  });

  it('resolves the min bound from the sibling start instant', () => {
    const values = { after: new Date('2026-06-01T00:00:00').toISOString() };
    expect(dateFieldBounds(before, values, '2026-07-27')).toEqual({
      min: '2026-06-01',
      max: '2026-07-27',
    });
  });

  it('flags a future day when the element disallows it', () => {
    const values = {
      after: new Date('2026-08-01T00:00:00').toISOString(),
    };
    expect(dateFieldViolation(after, values, '2026-07-27')).toBe('future');
  });

  it('flags a day past the sibling max', () => {
    const values = {
      after: new Date('2026-06-20T00:00:00').toISOString(),
      before: new Date('2026-06-15T23:59:59.999').toISOString(),
    };
    expect(dateFieldViolation(after, values, '2026-07-27')).toBe('max');
  });

  it('flags a day before the sibling min', () => {
    const values = {
      after: new Date('2026-06-20T00:00:00').toISOString(),
      before: new Date('2026-06-15T23:59:59.999').toISOString(),
    };
    expect(dateFieldViolation(before, values, '2026-07-27')).toBe('min');
  });

  it('reports no violation for an in-range or empty value', () => {
    const values = {
      after: new Date('2026-06-10T00:00:00').toISOString(),
      before: new Date('2026-06-15T23:59:59.999').toISOString(),
    };
    expect(dateFieldViolation(after, values, '2026-07-27')).toBeUndefined();
    expect(dateFieldViolation(before, values, '2026-07-27')).toBeUndefined();
    expect(dateFieldViolation(after, {}, '2026-07-27')).toBeUndefined();
  });
});
