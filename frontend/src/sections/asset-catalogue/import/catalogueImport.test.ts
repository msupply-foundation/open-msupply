import { describe, expect, it, vi } from 'vitest';
import { tWithValues } from '../testIntl';

vi.mock('@/intl', async original => ({
  ...(await original<typeof import('@/intl')>()),
  t: tWithValues,
}));

const {
  canStartImport,
  distinctPropertyKeys,
  errorMessage,
  importFilename,
  insertRefusal,
  parseCatalogueRows,
  rowsCsv,
  runImport,
  templateCsv,
  toInsertInput,
} = await import('./catalogueImport');
type Lookups = import('./catalogueImport').CatalogueLookups;

// Anchors: spec/asset-catalogue/cases/OMS-REG-CAT-02 — the import, the
// identity rules it meets (.37, .39) and the refused-rows download. The upload zone, the dialog and the wire are the e2e suite's;
// here the rules the import applies are pinned as pure functions.

const lookups: Lookups = {
  classes: [{ id: 'cls', name: 'Cold chain equipment' }],
  categories: [
    { id: 'cat-fridge', name: 'Refrigerators and freezers' },
    { id: 'cat-room', name: 'Cold rooms and freezer rooms' },
  ],
  types: [
    { id: 'typ-fridge', name: 'Refrigerator' },
    { id: 'typ-room', name: 'Cold room' },
  ],
  properties: [
    // Duplicate definitions of one key, one per scope — as the server answers.
    {
      id: 'p1',
      key: 'storage_capacity_5c',
      name: 'Storage capacity +5 °C (litres)',
      valueType: 'FLOAT',
      allowedValues: null,
    },
    {
      id: 'p2',
      key: 'storage_capacity_5c',
      name: 'Storage capacity +5 °C (litres)',
      valueType: 'FLOAT',
      allowedValues: null,
    },
    {
      id: 'p3',
      key: 'temperature_monitoring_device',
      name: 'Temperature monitoring device',
      valueType: 'STRING',
      allowedValues: 'Integrated, External, None',
    },
    {
      id: 'p4',
      key: 'initial_mapping_date',
      name: 'Initial mapping date',
      valueType: 'DATE',
      allowedValues: null,
    },
    {
      id: 'p5',
      key: 'external_dimensions',
      name: 'External dimensions',
      valueType: 'STRING',
      allowedValues: null,
    },
  ],
};

const HEADER = [
  'Sub catalogue',
  'Code',
  'Type',
  'Manufacturer',
  'Model',
  'Class',
  'Category',
  'storage_capacity_5c',
  'temperature_monitoring_device',
  'initial_mapping_date',
];
const good = [
  'WHO',
  'X-1',
  'Refrigerator',
  'Maker',
  'M-1',
  'Cold chain equipment',
  'Refrigerators and freezers',
  '',
  '',
  '',
];
const parse = (...rows: string[][]) =>
  parseCatalogueRows([HEADER, ...rows], lookups);
const errorsOf = (cells: string[]) => parse(cells).rows[0]!.errors;
const withCell = (index: number, value: string) =>
  good.map((cell, i) => (i === index ? value : cell));

describe('OMS-REG-CAT-02.4 — the template', () => {
  it('holds the seven item columns, one column per distinct property key, and one example row', () => {
    const lines = templateCsv(lookups.properties).split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]!.split(',')).toEqual([
      'label.sub-catalogue',
      'label.code',
      'label.type',
      'label.manufacturer',
      'label.model',
      'label.class',
      'label.category',
      'storage_capacity_5c',
      'temperature_monitoring_device',
      'initial_mapping_date',
      'external_dimensions',
    ]);
    expect(
      lines[1]!.startsWith('General,A Unique Code for this item,Refrigerator,')
    ).toBe(true);
    expect(distinctPropertyKeys(lookups.properties)).toHaveLength(4);
  });
  it('is named <instant>_<name>.csv', () => {
    expect(
      importFilename(
        'Example asset item import',
        new Date('2026-09-25T00:00:00.000Z')
      )
    ).toBe('2026-09-25T00:00:00.000Z_Example asset item import.csv');
  });
});

describe('OMS-REG-CAT-02.22 / .13 — well-formed rows', () => {
  it('a complete row carries no error, blank manufacturer and property cells included', () => {
    expect(errorsOf(good)).toEqual([]);
    expect(errorsOf(withCell(3, ''))).toEqual([]);
  });
  it('blank lines are skipped', () => {
    expect(
      parse(good, ['', ' ', '', '', '', '', '', '', '', ''], good).rows
    ).toHaveLength(2);
  });
});

describe('OMS-REG-CAT-02.14 — required cells', () => {
  it('a blank sub-catalogue is named as missing', () => {
    expect(errorsOf(withCell(0, '  '))).toEqual([
      'error.field-must-be-specified(label.sub-catalogue)',
    ]);
  });
  it('a blank code is named as the catalogue item code', () => {
    expect(errorsOf(withCell(1, ''))).toEqual([
      'error.field-must-be-specified(label.catalogue-item-code)',
    ]);
  });
  it('a blank model is named as missing', () => {
    expect(errorsOf(withCell(4, ''))).toEqual([
      'error.field-must-be-specified(label.model)',
    ]);
  });
});

describe('OMS-REG-CAT-02.8 / .10 / .23 — names that match nothing', () => {
  it.each([
    [5, 'Bogus class', 'label.class'],
    [6, 'Bogus category', 'label.category'],
    [2, 'Bogus type', 'label.type'],
  ])('cell %i "%s" is named as not a valid %s', (index, value, field) => {
    expect(errorsOf(withCell(index as number, value as string))).toEqual([
      `error.invalid-field-value(${field}|${value})`,
    ]);
  });
  it('names match exactly — a trailing space is no match', () => {
    expect(errorsOf(withCell(5, 'Cold chain equipment '))).toHaveLength(1);
  });
});

describe('OMS-REG-CAT-02.24 / .25 — allowed values', () => {
  it('a value outside the list is refused', () => {
    expect(errorsOf(withCell(8, 'Sometimes'))).toEqual([
      'error.invalid-field-value(Temperature monitoring device|Sometimes)',
    ]);
  });
  it('every entry of the list is choosable — the second, "External", too', () => {
    expect(errorsOf(withCell(8, 'External'))).toEqual([]);
    expect(errorsOf(withCell(8, 'None'))).toEqual([]);
  });
});

describe('OMS-REG-CAT-02.26 — number properties', () => {
  it('a non-number is refused, once per definition of its key (README › captured as-is)', () => {
    expect(errorsOf(withCell(7, 'abc'))).toEqual([
      'error.invalid-field-value(Storage capacity +5 °C (litres)|abc)',
      'error.invalid-field-value(Storage capacity +5 °C (litres)|abc)',
    ]);
  });
  it('a number is stored as a number', () => {
    expect(parse(withCell(7, '12.5')).rows[0]!.properties).toEqual(
      Object.fromEntries([['storage_capacity_5c', 12.5]])
    );
  });
});

describe('OMS-REG-CAT-02.27 / .28 — date properties', () => {
  it('DD/MM/YYYY is stored as the plain date', () => {
    expect(parse(withCell(9, '01/02/2024')).rows[0]!.properties).toEqual(
      Object.fromEntries([['initial_mapping_date', '2024-02-01']])
    );
  });
  it.each(['15/13/2024', '2024-02-01', '01/02/24'])(
    '"%s" is refused',
    value => {
      expect(errorsOf(withCell(9, value))).toEqual([
        `error.invalid-field-value(Initial mapping date|${value})`,
      ]);
    }
  );
});

describe('OMS-REG-CAT-02.29 — a failing row blocks the whole file', () => {
  it('only a file of clean rows can start', () => {
    expect(canStartImport(parse(good, good).rows)).toBe(true);
    expect(canStartImport(parse(good, withCell(1, '')).rows)).toBe(false);
    expect(canStartImport([])).toBe(false);
  });
});

describe('OMS-REG-CAT-02.31 — the item cells are read by position', () => {
  it('renamed headings read the same rows', () => {
    const renamed = parseCatalogueRows(
      [['a', 'b', 'c', 'd', 'e', 'f', 'g'], good.slice(0, 7)],
      lookups
    );
    expect(renamed.rows[0]).toMatchObject({
      code: 'X-1',
      typeId: 'typ-fridge',
      categoryId: 'cat-fridge',
      classId: 'cls',
    });
    expect(renamed.rows[0]!.errors).toEqual([]);
  });
});

describe('OMS-REG-CAT-02.32 — classification is checked to exist, not to belong together', () => {
  it('a cold-room type under the refrigerator category passes as written', () => {
    const row = parse(withCell(2, 'Cold room')).rows[0]!;
    expect(row.errors).toEqual([]);
    expect(row).toMatchObject({ typeId: 'typ-room', categoryId: 'cat-fridge' });
  });
});

describe('OMS-REG-CAT-02.7 / .37 / .39 — the insert a row becomes', () => {
  it('carries every item cell as typed and the specification as JSON', () => {
    const row = parse(withCell(7, '4')).rows[0]!;
    expect(toInsertInput(row, 'id-1')).toEqual({
      id: 'id-1',
      subCatalogue: 'WHO',
      code: 'X-1',
      manufacturer: 'Maker',
      model: 'M-1',
      classId: 'cls',
      categoryId: 'cat-fridge',
      typeId: 'typ-fridge',
      properties: '{"storage_capacity_5c":4}',
    });
  });
  it('keeps the code as typed — codes differing by case stay distinct (OMS-REG-CAT-02.37)', () => {
    expect(
      toInsertInput(parse(withCell(1, 'e001/001-c')).rows[0]!, 'i').code
    ).toBe('e001/001-c');
  });
  it('a blank manufacturer is sent as none, so it never joins the manufacturer/model/type check (.39)', () => {
    expect(
      toInsertInput(parse(withCell(3, ' ')).rows[0]!, 'i').manufacturer
    ).toBeNull();
  });
});

describe('OMS-REG-CAT-02.12 / .34 — the reasons refused rows carry', () => {
  const refused = (error: object) =>
    insertRefusal({
      __typename: 'InsertAssetCatalogueItemError',
      error,
    } as never);
  it('a taken code', () => {
    expect(
      refused({
        __typename: 'UniqueValueViolation',
        field: 'code',
        description: 'd',
      })
    ).toBe('error.unique-value-violation(label.code)');
  });
  it('a taken manufacturer, model and type', () => {
    expect(
      refused({
        __typename: 'UniqueCombinationViolation',
        fields: ['manufacturer', 'model'],
        description: 'd',
      })
    ).toBe('error.manufacturer-model-unique');
  });
  it('a taken id', () => {
    expect(
      refused({ __typename: 'RecordAlreadyExist', description: 'd' })
    ).toBe('error.record-already-exists');
  });
  it('an added item carries none', () => {
    expect(
      insertRefusal({ __typename: 'AssetCatalogueItemNode', id: 'x' })
    ).toBeUndefined();
  });
});

describe('OMS-REG-CAT-02.33 / .35 — the run adds each row on its own', () => {
  it('returns only the refused rows, in file order, and reports progress per batch', async () => {
    const rows = parse(
      ...Array.from({ length: 23 }, (_, i) => withCell(1, `C-${i}`))
    ).rows;
    const progress: number[] = [];
    const refused = await runImport(
      rows,
      async row =>
        row.code === 'C-3' || row.code === 'C-20' ? 'taken' : undefined,
      p => progress.push(p.sent)
    );
    expect(refused.map(r => [r.row.code, r.reason])).toEqual([
      ['C-3', 'taken'],
      ['C-20', 'taken'],
    ]);
    expect(progress).toEqual([10, 20, 23]);
  });
});

describe('OMS-REG-CAT-02.30 / .15 — the downloadable rows', () => {
  it("keep the upload's columns in its order with the reason appended", () => {
    const csv = rowsCsv(
      ['A', 'B', 'extra'],
      [{ cells: ['1', '2', 'x'], message: errorMessage(['first', 'second']) }]
    );
    expect(csv.split('\r\n')).toEqual([
      'A,B,extra,label.error-message',
      '1,2,x,"first, second"',
    ]);
  });
});
