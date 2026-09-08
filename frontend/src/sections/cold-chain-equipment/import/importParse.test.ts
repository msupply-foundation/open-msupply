/* eslint-disable camelcase -- The specification's property KEYS are the
   server's own, and snake_case: `climate_zone`, `initial_mapping_date`. They
   are data, not identifiers this app chooses, so the fixtures below spell them
   exactly as the catalogue serves them. */
import { describe, expect, it } from 'vitest';
import { CCE_CLASS_ID } from '../equipment';
import type { PropertyDefinition } from '../detail/assetProperties';
import {
  buildTemplateCsv,
  canImport,
  failedRowsToCsv,
  hasErrors,
  hasWarnings,
  isCsvFileName,
  parseImportDate,
  parseImportFile,
  parseImportStatus,
  parseNeedsReplacement,
  rowToInsertInput,
} from './importParse';

// In node vitest no dictionary is loaded, so `t()` answers with the key itself
// — which is what these headers and messages are asserted against.
const H = [
  'label.asset-number',
  'label.catalogue-item-code',
  'label.installation-date',
  'label.replacement-date',
  'label.warranty-start-date',
  'label.warranty-end-date',
  'label.serial',
  'label.functional-status',
  'label.needs-replacement',
  'label.asset-notes',
].join(',');

const property = (key: string, name: string): PropertyDefinition =>
  ({
    id: key,
    key,
    name,
    valueType: 'STRING',
    allowedValues: null,
    assetClassId: null,
    assetCategoryId: null,
    assetTypeId: null,
  }) as PropertyDefinition;

const lookup = (over: Partial<Parameters<typeof parseImportFile>[1]> = {}) => ({
  catalogueItems: [{ id: 'item-1', code: 'E003/059' }],
  stores: [{ id: 'store-b', code: 'PS' }],
  properties: [] as PropertyDefinition[],
  isCentral: false,
  newId: (index: number) => `new-${index}`,
  ...over,
});

describe('AC-I1 only a CSV is accepted', () => {
  it('accepts a .csv file, whatever its case', () => {
    expect(isCsvFileName('assets.csv')).toBe(true);
    expect(isCsvFileName('ASSETS.CSV')).toBe(true);
  });

  it('refuses anything else — before the contents are read', () => {
    expect(isCsvFileName('assets.xlsx')).toBe(false);
    expect(isCsvFileName('assets')).toBe(false);
  });
});

describe('AC-I2 a clean file parses every row', () => {
  it('reads each body row with its values', () => {
    const rows = parseImportFile(
      `${H}\nCCE-1,E003/059,01/02/2024,,,,SN-1,,,a note\n`,
      lookup()
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      assetNumber: 'CCE-1',
      catalogueItemCode: 'E003/059',
      catalogueItemId: 'item-1',
      serialNumber: 'SN-1',
      notes: 'a note',
      installationDate: '2024-02-01',
    });
    expect(rows[0]?.errors).toEqual([]);
  });

  it('numbers rows as the file’s own lines — the header is line 1', () => {
    const rows = parseImportFile(
      `${H}\nCCE-1,E003/059,,,,,,,,\nCCE-2,E003/059,,,,,,,,\n`,
      lookup()
    );
    expect(rows.map(row => row.lineNumber)).toEqual([2, 3]);
  });

  it('reads a header-only file as no rows at all', () => {
    expect(parseImportFile(`${H}\n`, lookup())).toEqual([]);
    expect(parseImportFile('', lookup())).toEqual([]);
  });

  it('lets the import proceed', () => {
    const rows = parseImportFile(`${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    expect(canImport(rows)).toBe(true);
  });
});

describe('AC-I3 the asset number is required', () => {
  it('fails a row with none', () => {
    const rows = parseImportFile(`${H}\n,E003/059,,,,,,,,\n`, lookup());
    expect(rows[0]?.errors).toContain('error.field-must-be-specified');
    expect(canImport(rows)).toBe(false);
  });
});

describe('AC-I4 asset numbers are unique within the file', () => {
  it('fails BOTH sides of a duplicate', () => {
    const rows = parseImportFile(
      `${H}\nCCE-1,E003/059,,,,,,,,\nCCE-1,E003/059,,,,,,,,\n`,
      lookup()
    );
    expect(rows[0]?.errors).toContain('error.duplicated-field');
    expect(rows[1]?.errors).toContain('error.duplicated-field');
  });

  it('compares case-insensitively', () => {
    const rows = parseImportFile(
      `${H}\ncce-1,E003/059,,,,,,,,\nCCE-1,E003/059,,,,,,,,\n`,
      lookup()
    );
    expect(hasErrors(rows)).toBe(true);
  });

  it('does not flag distinct numbers', () => {
    const rows = parseImportFile(
      `${H}\nCCE-1,E003/059,,,,,,,,\nCCE-2,E003/059,,,,,,,,\n`,
      lookup()
    );
    expect(rows.every(row => row.errors.length === 0)).toBe(true);
  });
});

describe('AC-I5 the catalogue item code must match', () => {
  it('fails a row whose code matches nothing', () => {
    const rows = parseImportFile(`${H}\nCCE-1,NOPE,,,,,,,,\n`, lookup());
    expect(rows[0]?.errors).toContain('error.code-no-match');
    expect(rows[0]?.catalogueItemId).toBeNull();
  });

  it('fails a row with no code at all', () => {
    const rows = parseImportFile(`${H}\nCCE-1,,,,,,,,,\n`, lookup());
    expect(rows[0]?.errors).toContain('error.field-must-be-specified');
  });

  it('resolves a matching code to its catalogue item', () => {
    const rows = parseImportFile(`${H}\nCCE-1,e003/059,,,,,,,,\n`, lookup());
    expect(rows[0]?.catalogueItemId).toBe('item-1');
  });
});

describe('AC-I6 / AC-I7 the four dates are soft', () => {
  it('warns rather than fails on a blank date, and still imports', () => {
    const rows = parseImportFile(`${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    expect(rows[0]?.errors).toEqual([]);
    expect(rows[0]?.warnings).toContain('warning.field-not-parsed');
    expect(canImport(rows)).toBe(true);
    expect(hasWarnings(rows)).toBe(true);
  });

  it('warns on an unreadable date and drops that value only', () => {
    const rows = parseImportFile(
      `${H}\nCCE-1,E003/059,not-a-date,,,,,,,\n`,
      lookup()
    );
    expect(rows[0]?.installationDate).toBeNull();
    expect(rows[0]?.errors).toEqual([]);
  });

  it('refuses a two-digit year — the rule this exists for', () => {
    expect(parseImportDate('05/10/24')).toBeNull();
  });

  it('reads DD/MM/YYYY, never MM/DD/YYYY', () => {
    expect(parseImportDate('01/02/2024')).toBe('2024-02-01');
    expect(parseImportDate('31/12/2030')).toBe('2030-12-31');
  });

  it('refuses an impossible day rather than rolling it over', () => {
    expect(parseImportDate('31/02/2024')).toBeNull();
    expect(parseImportDate('00/01/2024')).toBeNull();
    expect(parseImportDate('01/13/2024')).toBeNull();
  });

  it('refuses a value that is not three parts', () => {
    expect(parseImportDate('2024-02-01')).toBeNull();
    expect(parseImportDate('')).toBeNull();
  });
});

describe('AC-I8 an unreadable status falls back to Functioning', () => {
  it('matches a status by its own label, case-insensitively', () => {
    expect(parseImportStatus('status.not-in-use')).toBe('NOT_IN_USE');
    expect(parseImportStatus('STATUS.NOT-IN-USE')).toBe('NOT_IN_USE');
  });

  it('falls back for a blank or unmatched value', () => {
    expect(parseImportStatus('')).toBe('FUNCTIONING');
    expect(parseImportStatus('broken-ish')).toBe('FUNCTIONING');
  });
});

describe('the replacement flag', () => {
  it('reads as set for any value containing "true"', () => {
    expect(parseNeedsReplacement('TRUE')).toBe(true);
    expect(parseNeedsReplacement('true-ish')).toBe(true);
  });

  it('reads as unset otherwise', () => {
    expect(parseNeedsReplacement('')).toBe(false);
    expect(parseNeedsReplacement('X')).toBe(false);
  });
});

describe('specification columns', () => {
  it('reads a column headed by the property’s own display name', () => {
    const rows = parseImportFile(
      `${H},Climate zone\nCCE-1,E003/059,,,,,,,,,Hot\n`,
      lookup({ properties: [property('climate_zone', 'Climate zone')] })
    );
    expect(rows[0]?.properties).toEqual({ climate_zone: 'Hot' });
  });

  it('leaves an empty specification cell out entirely', () => {
    const rows = parseImportFile(
      `${H},Climate zone\nCCE-1,E003/059,,,,,,,,,\n`,
      lookup({ properties: [property('climate_zone', 'Climate zone')] })
    );
    expect(rows[0]?.properties).toEqual({});
  });
});

describe('the store column', () => {
  const centralHeader = ['label.store', H].join(',');

  it('is read only where the destination offers it', () => {
    const rows = parseImportFile(
      `${H}\nCCE-1,E003/059,,,,,,,,\n`,
      lookup({ isCentral: false })
    );
    expect(rows[0]?.storeId).toBeNull();
    expect(rows[0]?.errors).toEqual([]);
  });

  it('resolves a matching store code', () => {
    const rows = parseImportFile(
      `${centralHeader}\nPS,CCE-1,E003/059,,,,,,,,\n`,
      lookup({ isCentral: true })
    );
    expect(rows[0]?.storeId).toBe('store-b');
  });

  it('fails a code matching no store', () => {
    const rows = parseImportFile(
      `${centralHeader}\nNOPE,CCE-1,E003/059,,,,,,,,\n`,
      lookup({ isCentral: true })
    );
    expect(rows[0]?.errors).toContain('error.code-no-match');
  });

  it('accepts an omitted store — the asset stays on the acting store', () => {
    const rows = parseImportFile(
      `${centralHeader}\n,CCE-1,E003/059,,,,,,,,\n`,
      lookup({ isCentral: true })
    );
    expect(rows[0]?.errors).toEqual([]);
    expect(rows[0]?.storeId).toBeNull();
  });
});

describe('AC-I9 a parsed row becomes an insert', () => {
  it('always names the cold-chain class', () => {
    const rows = parseImportFile(`${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    expect(rowToInsertInput(rows[0]!, CCE_CLASS_ID).classId).toBe(
      CCE_CLASS_ID
    );
  });

  it('carries the catalogue item, the dates and the specification', () => {
    const rows = parseImportFile(
      `${H},Climate zone\nCCE-1,E003/059,01/02/2024,,,,SN-1,,TRUE,a note,Hot\n`,
      lookup({ properties: [property('climate_zone', 'Climate zone')] })
    );
    expect(rowToInsertInput(rows[0]!, CCE_CLASS_ID)).toMatchObject({
      assetNumber: 'CCE-1',
      catalogueItemId: 'item-1',
      serialNumber: 'SN-1',
      notes: 'a note',
      installationDate: '2024-02-01',
      needsReplacement: true,
      properties: '{"climate_zone":"Hot"}',
    });
  });

  it('sends null rather than an empty serial or note', () => {
    const rows = parseImportFile(`${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    const input = rowToInsertInput(rows[0]!, CCE_CLASS_ID);
    expect(input.serialNumber).toBeNull();
    expect(input.notes).toBeNull();
  });

  it('omits the store where the row named none', () => {
    const rows = parseImportFile(`${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    expect(rowToInsertInput(rows[0]!, CCE_CLASS_ID)).not.toHaveProperty(
      'storeId'
    );
  });
});

describe('AC-I10 the failed rows export', () => {
  it('appends the line number and the reason', () => {
    const rows = parseImportFile(`${H}\n,NOPE,,,,,,,,\n`, lookup());
    const csv = failedRowsToCsv(rows, [], false);
    const header = csv.split('\r\n')[0] ?? '';
    expect(header).toContain('label.line-number');
    expect(header).toContain('label.error-message');
    expect(csv).toContain('error.code-no-match');
  });

  it('carries the line number a user reads in their spreadsheet', () => {
    const rows = parseImportFile(`${H}\n,NOPE,,,,,,,,\n`, lookup());
    expect(failedRowsToCsv(rows, [], false)).toContain('2');
  });
});

describe('AC-I11 the template', () => {
  it('carries the import’s own columns', () => {
    const header = buildTemplateCsv([], false).split('\r\n')[0] ?? '';
    expect(header).toContain('label.asset-number');
    expect(header).toContain('label.catalogue-item-code');
    expect(header).toContain('label.asset-notes');
  });

  it('shows the date format each date column expects', () => {
    expect(buildTemplateCsv([], false)).toContain('label.date-format');
  });

  it('appends one column per specification key, de-duplicated', () => {
    const header =
      buildTemplateCsv(['climate_zone', 'climate_zone'], false).split(
        '\r\n'
      )[0] ?? '';
    expect(header.split(',').filter(c => c === 'climate_zone')).toHaveLength(1);
  });

  it('leads with the store column on a central server only', () => {
    expect(buildTemplateCsv([], true).split(',')[0]).toBe('label.store');
    expect(buildTemplateCsv([], false).split(',')[0]).not.toBe('label.store');
  });

  it('round-trips: its own header parses back to one example row', () => {
    const rows = parseImportFile(buildTemplateCsv([], false), lookup());
    expect(rows).toHaveLength(1);
  });
});
