import { describe, expect, it } from 'vitest';
import { parseCsv } from '@/domain/reportFiles';
import {
  IMPORT_BATCH_SIZE,
  allowedValues,
  applicableRows,
  batches,
  buildTemplateCsv,
  isCsvFileName,
  matchColumns,
  outcomeSucceeded,
  parseImportFile,
  parseProperties,
  summariseOutcome,
  type ImportRow,
  type PropertyDefinition,
  type RowOutcome,
} from './propertyImport';

// Anchors: spec/names/cases/OMS-REG-MNG-02 (the facility-property import).
// In node the catalog isn't loaded, so t() falls back to its keys — the
// assertions on failure reasons pin the KEY standing in for the translated
// message, and the data cells are exact.

const definition = (
  over: Partial<PropertyDefinition['property']> = {}
): PropertyDefinition => ({
  id: over.key ?? 'facility_type',
  property: {
    id: over.key ?? 'facility_type',
    key: 'facility_type',
    name: 'Facility Type',
    valueType: 'STRING',
    allowedValues: 'Referral Hospital,Maternal Clinic',
    ...over,
  },
});

const POPULATION = definition({
  key: 'population_served',
  name: 'Population Served',
  valueType: 'FLOAT',
  allowedValues: null,
});
const FACILITY_TYPE = definition();
const DEFS = [FACILITY_TYPE, POPULATION];

const FACILITIES = [
  { id: 'name-kopu', code: 'Kopu', properties: '{"latitude":-37.1}' },
  { id: 'name-opua', code: 'Opua', properties: '{}' },
];

describe('OMS-REG-MNG-02.35 — a non-CSV file is refused before parsing', () => {
  it('judges the file by its name', () => {
    expect(isCsvFileName('facilities.csv')).toBe(true);
    expect(isCsvFileName('FACILITIES.CSV')).toBe(true);
    expect(isCsvFileName('facilities.xlsx')).toBe(false);
    expect(isCsvFileName('facilities')).toBe(false);
  });
});

describe('OMS-REG-MNG-02.13 — the template includes all import columns', () => {
  it('heads the file with code, name, and one column per property', () => {
    const csv = buildTemplateCsv(DEFS, []);
    // The property columns are headed by the property's OWN display name —
    // data, not app copy. Code/Name come from the catalog (keys in node).
    expect(csv.split('\r\n')[0]).toBe(
      'label.code,label.name,Facility Type,Population Served'
    );
  });
});

describe('OMS-REG-MNG-02.36 — the template carries current values', () => {
  it('fills each facility row with what it already holds, not blanks', () => {
    const csv = buildTemplateCsv(DEFS, [
      {
        code: 'Kopu',
        name: 'Kopu Health Centre',
        properties:
          '{"facility_type":"Maternal Clinic","population_served":1200}',
      },
      { code: 'Opua', name: 'Opua Health Centre', properties: '{}' },
    ]);
    const [, kopu, opua] = csv.split('\r\n');
    expect(kopu).toBe('Kopu,Kopu Health Centre,Maternal Clinic,1200');
    // A facility with nothing recorded gets empty cells, never "undefined".
    expect(opua).toBe('Opua,Opua Health Centre,,');
  });

  it('reads a facility whose property blob is not an object as empty', () => {
    // The server never validates what it stores in this column.
    expect(parseProperties('null')).toEqual({});
    expect(parseProperties('[1,2]')).toEqual({});
    expect(parseProperties('not json')).toEqual({});
    expect(parseProperties(undefined)).toEqual({});
  });
});

describe('CSV reading', () => {
  it('reads quoted fields, doubled quotes, and both line endings', () => {
    expect(parseCsv('a,b\r\n"x,1","he said ""hi"""\n')).toEqual([
      ['a', 'b'],
      ['x,1', 'he said "hi"'],
    ]);
  });

  it('drops blank lines and a leading byte-order mark', () => {
    expect(parseCsv('\uFEFFa,b\n\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('column matching', () => {
  it('takes columns 1 and 2 as code and name whatever they are titled', () => {
    const matched = matchColumns(
      ['Facility Code', 'Facility Name', 'facility_type'],
      DEFS
    );
    expect(matched[0]).toBeUndefined();
    expect(matched[1]).toBeUndefined();
    expect(matched[2]).toBe(FACILITY_TYPE);
  });

  it('matches a property by its key OR its display name, and ignores the rest', () => {
    const matched = matchColumns(
      ['Code', 'Name', 'Population Served', 'something else'],
      DEFS
    );
    expect(matched[2]).toBe(POPULATION);
    // A column matching no property is ignored, not an error.
    expect(matched[3]).toBeUndefined();
  });

  it('splits a definition’s allowed values from the one wire string', () => {
    expect(allowedValues('Referral Hospital, Maternal Clinic')).toEqual([
      'Referral Hospital',
      'Maternal Clinic',
    ]);
    expect(allowedValues(null)).toEqual([]);
  });
});

describe('OMS-REG-MNG-02.38 — every bad row is flagged, with all its reasons', () => {
  const parse = (body: string) =>
    parseImportFile(
      `Code,Name,facility_type,population_served\n${body}`,
      DEFS,
      FACILITIES
    );

  it('flags a blank code and a blank name', () => {
    const [blankCode] = parse(',Kopu Health Centre,Maternal Clinic,10\n');
    expect(blankCode.errors).toEqual(['error.missing-required-field']);
    const [blankName] = parse('Kopu,,Maternal Clinic,10\n');
    expect(blankName.errors).toEqual(['error.missing-required-field']);
  });

  it('flags a value outside a property’s allowed values', () => {
    const [row] = parse('Kopu,Kopu Health Centre,Space Station,10\n');
    expect(row.errors).toEqual(['error.invalid-field-value']);
  });

  it('flags a non-numeric value for a numeric property', () => {
    const [row] = parse('Kopu,Kopu Health Centre,Maternal Clinic,lots\n');
    expect(row.errors).toEqual(['error.invalid-field-value']);
  });

  it('shows ALL of a row’s reasons together', () => {
    // One row failing two checks at once — the case observed live.
    const [row] = parse(',Kopu Health Centre,Space Station,lots\n');
    expect(row.errors).toHaveLength(3);
  });

  it('passes a good row with no reasons', () => {
    const [row] = parse('Kopu,Kopu Health Centre,Maternal Clinic,1200\n');
    expect(row.errors).toEqual([]);
    expect(row.values).toEqual({
      'facility_type': 'Maternal Clinic',
      // A numeric property is written as a NUMBER, not the cell's text.
      'population_served': 1200,
    });
  });

  it('leaves a property with no column, and a blank cell, as it was', () => {
    // Only facility_type has a column here; latitude keeps its recorded value.
    const [row] = parseImportFile(
      'Code,Name,facility_type\nKopu,Kopu Health Centre,\n',
      DEFS,
      FACILITIES
    );
    expect(JSON.parse(row.properties)).toEqual({ latitude: -37.1 });
    expect(row.errors).toEqual([]);
  });
});

describe('OMS-REG-MNG-02.39 — an unknown code passes review, refused only on apply', () => {
  it('gives an unmatched row an empty id and no review error', () => {
    const [row] = parseImportFile(
      'Code,Name,facility_type\nNOPE,Nowhere Clinic,Maternal Clinic\n',
      DEFS,
      FACILITIES
    );
    // Not flagged at review…
    expect(row.errors).toEqual([]);
    // …and submitted with an EMPTY id, which the server answers with the same
    // RecordNotFound an unknown id gets (contract § wire trap).
    expect(row.id).toBe('');
    expect(applicableRows([row])).toHaveLength(1);
  });
});

describe('OMS-REG-MNG-02.40 — rows are applied independently, ten at a time', () => {
  it('never submits a row the review flagged', () => {
    const rows = parseImportFile(
      'Code,Name,facility_type\nKopu,Kopu Health Centre,Maternal Clinic\n,Blank,Maternal Clinic\n',
      DEFS,
      FACILITIES
    );
    expect(rows).toHaveLength(2);
    expect(applicableRows(rows).map(row => row.code)).toEqual(['Kopu']);
  });

  it('splits the submittable rows into batches of ten', () => {
    expect(IMPORT_BATCH_SIZE).toBe(10);
    const items = Array.from({ length: 23 }, (_, i) => i);
    expect(batches(items).map(batch => batch.length)).toEqual([10, 10, 3]);
  });

  it('counts the rows that were written even when others failed', () => {
    const written = { code: 'Kopu', errors: [] } as unknown as ImportRow;
    const refused = { code: 'NOPE', errors: [] } as unknown as ImportRow;
    const outcomes = new Map<ImportRow, RowOutcome>([
      [written, { kind: 'written' }],
      [refused, { kind: 'refused', reason: 'Record does not exist' }],
    ]);
    const outcome = summariseOutcome([written, refused], outcomes);
    // The successful facility stays written — there is no rollback.
    expect(outcome.written).toBe(1);
    expect(outcome.failed).toHaveLength(1);
  });
});

describe('OMS-REG-MNG-02.41 — a failed run re-shows exactly the failed rows', () => {
  it('keeps only the failed rows, each carrying the server’s reason', () => {
    const written = { code: 'Kopu', errors: [] } as unknown as ImportRow;
    const refused = { code: 'NOPE', errors: [] } as unknown as ImportRow;
    const outcome = summariseOutcome(
      [written, refused],
      new Map<ImportRow, RowOutcome>([
        [written, { kind: 'written' }],
        [refused, { kind: 'refused', reason: 'Record does not exist' }],
      ])
    );
    expect(outcome.failed.map(row => row.code)).toEqual(['NOPE']);
    // Verbatim what the server said — there is no import-specific wording.
    expect(outcome.failed[0].errors).toEqual(['Record does not exist']);
  });

  it('keeps a review-flagged row’s own reasons, unsubmitted', () => {
    const flagged = {
      code: '',
      errors: ['error.missing-required-field'],
    } as unknown as ImportRow;
    const outcome = summariseOutcome([flagged], new Map());
    expect(outcome.written).toBe(0);
    expect(outcome.failed[0].errors).toEqual(['error.missing-required-field']);
  });
});

describe('OMS-REG-MNG-02.42 — a run with any failed row reports failure', () => {
  it('never reports success when a row failed (D97)', () => {
    const written = { code: 'a', errors: [] } as unknown as ImportRow;
    const refused = { code: 'b', errors: [] } as unknown as ImportRow;
    const outcome = summariseOutcome(
      [written, refused],
      new Map<ImportRow, RowOutcome>([
        [written, { kind: 'written' }],
        [refused, { kind: 'refused', reason: 'Record does not exist' }],
      ])
    );
    // The current app shows the SUCCESS string here — that is the whole of the
    // divergence this assertion pins.
    expect(outcomeSucceeded(outcome)).toBe(false);
  });
});

describe('OMS-REG-MNG-02.43 — an all-succeed run reports its count and closes', () => {
  it('reports success only when every row was written', () => {
    const a = { code: 'a', errors: [] } as unknown as ImportRow;
    const b = { code: 'b', errors: [] } as unknown as ImportRow;
    const outcome = summariseOutcome(
      [a, b],
      new Map<ImportRow, RowOutcome>([
        [a, { kind: 'written' }],
        [b, { kind: 'written' }],
      ])
    );
    expect(outcomeSucceeded(outcome)).toBe(true);
    expect(outcome.written).toBe(2);
  });

  it('does not call an empty run a success', () => {
    expect(outcomeSucceeded({ written: 0, failed: [], attempted: 0 })).toBe(
      false
    );
  });
});
