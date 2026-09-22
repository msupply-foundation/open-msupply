/* eslint-disable camelcase -- The specification's property KEYS are the
   server's own, and snake_case: `climate_zone`, `initial_mapping_date`. They
   are data, not identifiers this app chooses, so the fixtures below spell them
   exactly as the catalogue serves them. */
import { describe, expect, it } from 'vitest';
import { t } from '@/intl';
import { CCE_CLASS_ID } from '../equipment';
import type { PropertyDefinition } from '../detail/assetProperties';
import {
  buildTemplateCsv,
  canImport,
  compareReviewRows,
  failedRowsToCsv,
  parseImportBoolean,
  storeCodesIn,
  parseImportNumber,
  parsePropertyCell,
  reviewRowText,
  type ImportRow,
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

/**
 * The rows, insisting the file produced some. `parseImportFile` answers either
 * rows or the reason there are none, and all but the handful of tests below
 * are about the rows — so those assert they got them, instead of indexing into
 * whatever came back.
 */
const rowsOf = (...args: Parameters<typeof parseImportFile>): ImportRow[] => {
  const result = parseImportFile(...args);
  if (!Array.isArray(result))
    throw new Error(`expected rows, the file yielded: ${result}`);
  return result;
};

const lookup = (over: Partial<Parameters<typeof parseImportFile>[1]> = {}) => ({
  catalogueItems: [{ id: 'item-1', code: 'E003/059' }],
  stores: [{ id: 'store-b', code: 'PS' }],
  properties: [] as PropertyDefinition[],
  isCentral: false,
  newId: (index: number) => `new-${index}`,
  ...over,
});

describe('OMS-REG-CCE-07.1 — only a CSV is accepted', () => {
  it('accepts a .csv file, whatever its case', () => {
    expect(isCsvFileName('assets.csv')).toBe(true);
    expect(isCsvFileName('ASSETS.CSV')).toBe(true);
  });

  it('refuses anything else — before the contents are read', () => {
    expect(isCsvFileName('assets.xlsx')).toBe(false);
    expect(isCsvFileName('assets')).toBe(false);
  });
});

describe('OMS-REG-CCE-07.2 — a clean file parses every row', () => {
  it('reads each body row with its values', () => {
    const rows = rowsOf(
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
    const rows = rowsOf(
      `${H}\nCCE-1,E003/059,,,,,,,,\nCCE-2,E003/059,,,,,,,,\n`,
      lookup()
    );
    expect(rows.map(row => row.lineNumber)).toEqual([2, 3]);
  });

  it('reads a header-only file as no rows at all', () => {
    expect(parseImportFile(`${H}\n`, lookup())).toBe('no-rows');
    expect(parseImportFile('', lookup())).toBe('no-header');
  });

  it('lets the import proceed', () => {
    const rows = rowsOf(`${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    expect(canImport(rows)).toBe(true);
  });
});

describe('OMS-REG-CCE-07.3 — the asset number is required', () => {
  it('fails a row with none', () => {
    const rows = rowsOf(`${H}\n,E003/059,,,,,,,,\n`, lookup());
    expect(rows[0]?.errors).toContain('error.field-must-be-specified');
    expect(canImport(rows)).toBe(false);
  });
});

describe('OMS-REG-CCE-07.4 — asset numbers are unique within the file', () => {
  it('fails BOTH sides of a duplicate', () => {
    const rows = rowsOf(
      `${H}\nCCE-1,E003/059,,,,,,,,\nCCE-1,E003/059,,,,,,,,\n`,
      lookup()
    );
    expect(rows[0]?.errors).toContain('error.duplicated-field');
    expect(rows[1]?.errors).toContain('error.duplicated-field');
  });

  it('compares case-insensitively', () => {
    const rows = rowsOf(
      `${H}\ncce-1,E003/059,,,,,,,,\nCCE-1,E003/059,,,,,,,,\n`,
      lookup()
    );
    expect(hasErrors(rows)).toBe(true);
  });

  it('does not flag distinct numbers', () => {
    const rows = rowsOf(
      `${H}\nCCE-1,E003/059,,,,,,,,\nCCE-2,E003/059,,,,,,,,\n`,
      lookup()
    );
    expect(rows.every(row => row.errors.length === 0)).toBe(true);
  });
});

describe('OMS-REG-CCE-07.5 — the catalogue item code must match', () => {
  it('fails a row whose code matches nothing', () => {
    const rows = rowsOf(`${H}\nCCE-1,NOPE,,,,,,,,\n`, lookup());
    expect(rows[0]?.errors).toContain('error.code-no-match');
    expect(rows[0]?.catalogueItemId).toBeNull();
  });

  it('fails a row with no code at all', () => {
    const rows = rowsOf(`${H}\nCCE-1,,,,,,,,,\n`, lookup());
    expect(rows[0]?.errors).toContain('error.field-must-be-specified');
  });

  it('resolves a matching code to its catalogue item', () => {
    const rows = rowsOf(`${H}\nCCE-1,e003/059,,,,,,,,\n`, lookup());
    expect(rows[0]?.catalogueItemId).toBe('item-1');
  });
});

describe('OMS-REG-CCE-07.6 / .7 — the four dates are soft', () => {
  /*
   * All four dates are optional, so a blank is an ANSWER — "no warranty
   * recorded" — not a value we failed to read. It used to warn, which fired the
   * banner on the most ordinary file there is: one with no warranty dates. A
   * warning every user learns to dismiss takes the real ones down with it.
   */
  it('says nothing about a blank date, and still imports', () => {
    const rows = rowsOf(`${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    expect(rows[0]?.errors).toEqual([]);
    expect(rows[0]?.warnings).toEqual([]);
    expect(rows[0]?.installationDate).toBeNull();
    expect(canImport(rows)).toBe(true);
    expect(hasWarnings(rows)).toBe(false);
  });

  it('still warns when a date is present but unreadable', () => {
    const rows = rowsOf(`${H}\nCCE-1,E003/059,tuesday,,,,,,,\n`, lookup());
    expect(rows[0]?.warnings).toContain('warning.field-not-parsed');
    expect(hasWarnings(rows)).toBe(true);
  });

  it('warns on an unreadable date and drops that value only', () => {
    const rows = rowsOf(`${H}\nCCE-1,E003/059,not-a-date,,,,,,,\n`, lookup());
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
    expect(parseImportDate('')).toBeNull();
    expect(parseImportDate('2024')).toBeNull();
    expect(parseImportDate('01/02')).toBeNull();
  });

  /*
   * Three shapes are read, because three are what a spreadsheet hands back. The
   * dash form is the same day-first date with the separator Excel substitutes
   * under many Windows locales; ISO is what the server itself already accepts
   * for the mapping dates, so refusing it here made the client stricter than
   * the wire it writes to.
   */
  it('reads a dash-separated day-first date, as Excel writes it', () => {
    expect(parseImportDate('14-09-2026')).toBe('2026-09-14');
    expect(parseImportDate('01-02-2024')).toBe('2024-02-01');
  });

  it('reads a dot-separated day-first date — what our own ru export writes', () => {
    // exportDate under `ru` produces 14.09.2026, so refusing the dot meant our
    // own exported file could not be imported back.
    expect(parseImportDate('14.09.2026')).toBe('2026-09-14');
    expect(parseImportDate('01.02.2024')).toBe('2024-02-01');
  });

  it('reads ISO, which the server already accepts for the mapping dates', () => {
    expect(parseImportDate('2024-02-01')).toBe('2024-02-01');
    expect(parseImportDate('2026-09-14')).toBe('2026-09-14');
  });

  it('tells ISO from a dashed day-first date by which end carries the year', () => {
    // Four digits leading = ISO; four digits trailing = day-first. Neither
    // reading is a guess.
    expect(parseImportDate('2024-03-05')).toBe('2024-03-05');
    expect(parseImportDate('05-03-2024')).toBe('2024-03-05');
  });

  it('still refuses a two-digit year in every shape', () => {
    expect(parseImportDate('05-10-24')).toBeNull();
    expect(parseImportDate('24-10-05')).toBeNull();
  });

  it('still refuses an impossible day in the dash and ISO shapes', () => {
    expect(parseImportDate('31-02-2024')).toBeNull();
    expect(parseImportDate('2024-02-31')).toBeNull();
    expect(parseImportDate('2024-13-01')).toBeNull();
  });
});

describe('the CURRENT app’s export imports here', () => {
  /*
   * The migration requirement: a register exported from the app people are
   * moving off must import into this one. Its export
   * (`packages/coldchain/src/Equipment/utils.ts` § assetsToCsv) is
   * comma-separated with the same columns, `dd/MM/yyyy` dates via
   * Formatter.csvDateString, and the replacement flag as a RAW BOOLEAN —
   * `true`/`false`, where this app's own export writes `Yes`/`No`. Both have to
   * read, which is why the flag takes either.
   */
  const CURRENT_APP_EXPORT = [
    [
      'id',
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
      'label.created-datetime-UTC',
      'label.modified-datetime-UTC',
    ].join(','),
    'a1,OLD-1,E003/059,14/09/2026,14/09/2036,14/09/2026,14/09/2027,SER-1,status.functioning,true,from the current app,01/01/2024 00:00:00,01/01/2024 00:00:00',
    'a2,OLD-2,E003/059,15/09/2026,,,,SER-2,status.functioning,false,no flag,01/01/2024 00:00:00,01/01/2024 00:00:00',
  ].join('\r\n');

  it('reads every value, with no errors and no warnings', () => {
    const rows = rowsOf(CURRENT_APP_EXPORT, lookup());
    expect(rows).toHaveLength(2);
    expect(hasErrors(rows)).toBe(false);
    expect(hasWarnings(rows)).toBe(false);
    expect(rows[0]?.assetNumber).toBe('OLD-1');
    expect(rows[0]?.installationDate).toBe('2026-09-14');
    expect(rows[0]?.warrantyEnd).toBe('2027-09-14');
  });

  it('reads its raw-boolean replacement flag, both ways', () => {
    const rows = rowsOf(CURRENT_APP_EXPORT, lookup());
    expect(rows.map(row => row.needsReplacement)).toEqual([true, false]);
  });

  it('ignores the columns it carries that the import has no use for', () => {
    // `id` and the two UTC timestamps are looked up by name, so a column the
    // import does not know simply never gets read.
    const [first] = rowsOf(CURRENT_APP_EXPORT, lookup());
    expect(first?.errors).toEqual([]);
  });
});

describe('the reporter’s two templates (issue #663, second round)', () => {
  /*
   * Both were filled in and saved by the reporter, one from each app's
   * template, and both work in the current app but failed here. Their only
   * fault is the SEPARATOR — no banner row, dates already `DD/MM/YYYY`, real
   * catalogue codes — which is the regression: the current app auto-detects the
   * delimiter and this one used to assume a comma.
   *
   * The old app's template carries a leading Store column and the new app's
   * does not (both write it on a central server only). Either must read.
   */
  const base = (withStore: boolean) =>
    [
      ...(withStore ? ['label.store'] : []),
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
    ].join(';');

  const file = (withStore: boolean) =>
    [
      base(withStore),
      `${withStore ? ';' : ''}C1;E004/027;17/09/2026;17/09/2036;16/09/2026;16/09/2028;;status.functioning;;`,
      `${withStore ? ';' : ''}C2;E004/027;17/09/2026;17/09/2036;16/09/2026;16/09/2028;;status.functioning;;`,
    ].join('\r\n');

  const lookupWith = (isCentral: boolean) =>
    lookup({ catalogueItems: [{ id: 'item-1', code: 'E004/027' }], isCentral });

  for (const withStore of [true, false]) {
    const label = withStore ? 'the old app’s template' : 'this app’s template';
    for (const isCentral of [true, false]) {
      it(`${label} imports on a ${isCentral ? 'central' : 'store'} server`, () => {
        const rows = rowsOf(file(withStore), lookupWith(isCentral));
        expect(rows).toHaveLength(2);
        expect(hasErrors(rows)).toBe(false);
        expect(hasWarnings(rows)).toBe(false);
        expect(rows[0]?.assetNumber).toBe('C1');
        expect(rows[0]?.catalogueItemId).toBe('item-1');
        expect(rows[0]?.installationDate).toBe('2026-09-17');
        expect(rows[0]?.warrantyEnd).toBe('2028-09-16');
      });
    }
  }

  it('reads a Store column the file carries but this server has no use for', () => {
    // On a store server the column is not one the import knows, so it is simply
    // never looked up — it must not derail the columns beside it.
    const rows = rowsOf(file(true), lookupWith(false));
    expect(rows[0]?.assetNumber).toBe('C1');
    expect(rows[0]?.storeId).toBeNull();
  });
});

describe('a returned template carrying all three shapes at once', () => {
  /*
   * The banner row, semicolons for separators, and dashes in the dates —
   * together, which is how they actually arrive. Taken byte for byte from a
   * file a user could not import (2026-09-15); each shape alone was enough to
   * fail every row in it.
   *
   * What produced it is NOT known — the reporter says they did not open it in a
   * spreadsheet — so nothing here turns on the tool. The shapes are the fact;
   * the provenance is not.
   */
  const RETURNED = [
    'Column1;Column2;Column3;Column4;Column5;Column6;Column7;Column8;Column9;Column10',
    H.split(',').join(';'),
    'CCE-1;E003/059;14-09-2026;14-09-2036;14-09-2026;14-09-2027;ADF123568;status.functioning;;',
    'CCE-2;E003/059;15-09-2026;;;;ADF123569;status.functioning;;',
  ].join('\r\n');

  it('imports, where any one of the three defects failed every row', () => {
    const rows = rowsOf(RETURNED, lookup());
    expect(rows).toHaveLength(2);
    expect(hasErrors(rows)).toBe(false);
    expect(canImport(rows)).toBe(true);
  });

  it('reads the values, not just the shape', () => {
    const [first] = rowsOf(RETURNED, lookup());
    expect(first?.assetNumber).toBe('CCE-1');
    expect(first?.catalogueItemId).toBe('item-1');
    expect(first?.serialNumber).toBe('ADF123568');
    expect(first?.installationDate).toBe('2026-09-14');
    expect(first?.warrantyEnd).toBe('2027-09-14');
    expect(first?.status).toBe('FUNCTIONING');
  });

  it('numbers its lines as the spreadsheet shows them', () => {
    const rows = rowsOf(RETURNED, lookup());
    expect(rows.map(row => row.lineNumber)).toEqual([3, 4]);
  });
});

describe('the heading row is found, not assumed to be first', () => {
  /*
   * A spreadsheet writes a banner row of its own (`Column1 … ColumnN`) above
   * the real names when a file has been through a text-to-columns step. The
   * user cannot see that it is wrong — on screen it is still the file we gave
   * them — so taking row 1 on faith reported every row as missing an asset
   * number it plainly had.
   */
  const BANNER =
    'Column1,Column2,Column3,Column4,Column5,Column6,Column7,Column8,Column9,Column10';

  it('reads past a spreadsheet banner row to the real heading', () => {
    const rows = rowsOf(`${BANNER}\n${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.assetNumber).toBe('CCE-1');
    expect(rows[0]?.errors).toEqual([]);
  });

  it('numbers the line as the spreadsheet does, counting the banner', () => {
    const rows = rowsOf(`${BANNER}\n${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    // banner = 1, heading = 2, first body row = 3.
    expect(rows[0]?.lineNumber).toBe(3);
  });

  it('still numbers from 2 when the heading is where it belongs', () => {
    const rows = rowsOf(`${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    expect(rows[0]?.lineNumber).toBe(2);
  });

  it('refuses a file whose rows name no column it knows', () => {
    // Loudly — not as a hundred rows each "missing" a value they carry.
    expect(parseImportFile(`${BANNER}\nC1,C1,,,,,,,,\n`, lookup())).toBe(
      'no-header'
    );
  });

  /*
   * Two files yield no rows for two different reasons, and the modal must not
   * tell the second user to compare a heading that already matches.
   */
  it('says WHY a file yields nothing: unknown heading, or a known one with no rows', () => {
    expect(parseImportFile(`${BANNER}\nC1,C1,,,,,,,,\n`, lookup())).toBe(
      'no-header'
    );
    // The template with its example row deleted, or an empty register's export.
    expect(parseImportFile(`${H}\n`, lookup())).toBe('no-rows');
    expect(parseImportFile(`${BANNER}\n${H}\n`, lookup())).toBe('no-rows');
    expect(parseImportFile('', lookup())).toBe('no-header');
    // And a file that yields rows answers with them, not with a reason.
    expect(
      parseImportFile(`${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup())
    ).toHaveLength(1);
  });

  it('does not go hunting past the first few rows for a heading', () => {
    const padding = Array(8).fill(BANNER).join('\n');
    expect(
      parseImportFile(`${padding}\n${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup())
    ).toBe('no-header');
  });
});

describe('OMS-REG-CCE-07.8 — an unreadable status falls back to Functioning', () => {
  it('matches a status by its own label, case-insensitively', () => {
    expect(parseImportStatus('status.not-in-use')).toBe('NOT_IN_USE');
    expect(parseImportStatus('STATUS.NOT-IN-USE')).toBe('NOT_IN_USE');
  });

  it('falls back for a blank or unmatched value', () => {
    expect(parseImportStatus('')).toBe('FUNCTIONING');
    expect(parseImportStatus('broken-ish')).toBe('FUNCTIONING');
  });
});

describe('one boolean vocabulary, whatever column it is in', () => {
  /*
   * A file carries its yes/no in one vocabulary; the app used to read it in
   * two. A Russian user's `Да` set the replacement flag and was dropped from a
   * boolean specification column one cell over, and a `1` did the reverse.
   */
  it('reads the raw booleans the current app exports', () => {
    expect(parseImportBoolean('true')).toBe(true);
    expect(parseImportBoolean('FALSE')).toBe(false);
  });

  it('reads the words a user types, and 1/0', () => {
    for (const yes of ['yes', 'Y', '1'])
      expect(parseImportBoolean(yes)).toBe(true);
    for (const no of ['no', 'N', '0'])
      expect(parseImportBoolean(no)).toBe(false);
  });

  it('reads the Yes/No this app’s own export writes, in the reader’s language', () => {
    expect(parseImportBoolean(t('messages.yes'))).toBe(true);
    expect(parseImportBoolean(t('messages.no'))).toBe(false);
  });

  it('answers undefined when the cell answers nothing', () => {
    expect(parseImportBoolean('')).toBeUndefined();
    expect(parseImportBoolean('maybe')).toBeUndefined();
  });

  it('is the SAME vocabulary the specification column reads', () => {
    const boolean = { valueType: 'BOOLEAN', allowedValues: null } as never;
    for (const cell of ['1', t('messages.yes'), 'y', 'true']) {
      expect(
        parsePropertyCell(cell, boolean),
        `"${cell}" in a property column`
      ).toBe(true);
      expect(parseNeedsReplacement(cell), `"${cell}" in the flag column`).toBe(
        true
      );
    }
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

  /*
   * The EXPORT writes this column as Yes/No, so an asset exported and
   * re-imported used to come back with its flag silently cleared. The two
   * files this vertical produces must both read back into it.
   */
  it('reads the Yes the list export writes', () => {
    expect(parseNeedsReplacement(t('messages.yes'))).toBe(true);
    expect(parseNeedsReplacement(t('messages.no'))).toBe(false);
  });

  it('reads a plain yes, whatever its case', () => {
    expect(parseNeedsReplacement('Yes')).toBe(true);
    expect(parseNeedsReplacement('y')).toBe(true);
    expect(parseNeedsReplacement('no')).toBe(false);
  });
});

describe('specification columns', () => {
  it('reads a column headed by the property’s own display name', () => {
    const rows = rowsOf(
      `${H},Climate zone\nCCE-1,E003/059,,,,,,,,,Hot\n`,
      lookup({ properties: [property('climate_zone', 'Climate zone')] })
    );
    expect(rows[0]?.properties).toEqual({ climate_zone: 'Hot' });
  });

  it('leaves an empty specification cell out entirely', () => {
    const rows = rowsOf(
      `${H},Climate zone\nCCE-1,E003/059,,,,,,,,,\n`,
      lookup({ properties: [property('climate_zone', 'Climate zone')] })
    );
    expect(rows[0]?.properties).toEqual({});
  });
});

describe('numbers: a comma is the decimal mark unless it is plainly grouping', () => {
  /*
   * The same Windows locale that writes `;` between fields writes `12,5` for
   * twelve and a half — the separators exist precisely so the comma can be the
   * decimal mark. But the converse does not hold: Google Sheets downloads a
   * comma-separated file whatever the sheet's locale, cells as displayed, so a
   * `12,5` turns up in comma files too. Stripping the comma there imported 125
   * with no warning — worse than the refusal it replaced.
   */
  it('reads a decimal comma when the file is not comma-separated', () => {
    expect(parseImportNumber('12,5', true)).toBe(12.5);
    expect(parseImportNumber('0,75', true)).toBe(0.75);
    // In a `;` file the comma is never a group mark, so this is one-and-a-bit.
    expect(parseImportNumber('1,234', true)).toBe(1.234);
  });

  it('reads a decimal comma in a comma-separated file too, where it cannot be grouping', () => {
    // None of these is a grouped number in any convention.
    expect(parseImportNumber('12,5')).toBe(12.5);
    expect(parseImportNumber('0,5')).toBe(0.5);
    expect(parseImportNumber('-12,5')).toBe(-12.5);
    expect(parseImportNumber('1 234,5')).toBe(1234.5);
  });

  it('reads a decimal point, as it always did', () => {
    expect(parseImportNumber('12.5')).toBe(12.5);
    expect(parseImportNumber('-4')).toBe(-4);
    // A dot is the decimal mark in EITHER kind of file — the separator is not
    // trusted to turn 1.234 into a thousand.
    expect(parseImportNumber('1.234', true)).toBe(1.234);
  });

  it('treats a comma as a group mark only when the digits group in threes, in a comma file', () => {
    // A quoted "1,234" in a comma-delimited file is a thousand-odd, not 1.234.
    expect(parseImportNumber('1,234')).toBe(1234);
    expect(parseImportNumber('12,345,678')).toBe(12345678);
  });

  it('refuses commas that are neither', () => {
    expect(parseImportNumber('1,2,3')).toBeUndefined();
    expect(parseImportNumber('1,23,456')).toBeUndefined();
  });

  it('needs no convention when BOTH marks are present — the last one decides', () => {
    expect(parseImportNumber('1.234,56', true)).toBe(1234.56);
    expect(parseImportNumber('1,234.56')).toBe(1234.56);
    // And the answer does not depend on which file it came from.
    expect(parseImportNumber('1.234,56', false)).toBe(1234.56);
    expect(parseImportNumber('1,234.56', true)).toBe(1234.56);
  });

  it('ignores the spacing a spreadsheet groups with', () => {
    expect(parseImportNumber('1 234,5', true)).toBe(1234.5);
    expect(parseImportNumber('1\u00a0234.5')).toBe(1234.5);
  });

  it('refuses text', () => {
    expect(parseImportNumber('lots')).toBeUndefined();
    expect(parseImportNumber('')).toBeUndefined();
    expect(parseImportNumber('12kg')).toBeUndefined();
  });

  /*
   * Only a SEMICOLON is evidence of a decimal comma. The argument is that a
   * spreadsheet reaches for `;` because its locale took the comma — a tab is
   * chosen for reasons of its own and says nothing, so reading it as evidence
   * turned a grouped thousand from an en-locale sheet into one-and-a-bit.
   */
  it('groups a tab-separated file as a comma file does', () => {
    const header = [
      'label.asset-number',
      'label.catalogue-item-code',
      'Capacity',
    ].join('\t');
    const [row] = rowsOf(
      `${header}\nCCE-1\tE003/059\t1,234\n`,
      lookup({
        properties: [
          {
            ...property('cap', 'Capacity'),
            valueType: 'FLOAT',
          } as PropertyDefinition,
        ],
      })
    );
    expect(row?.properties.cap).toBe(1234);
  });

  it('carries the file’s convention into a semicolon-separated import', () => {
    const header = `${H.split(',').join(';')};Capacity`;
    const row = 'CCE-1;E003/059;;;;;;;;;12,5';
    const [parsed] = rowsOf(
      `${header}\n${row}\n`,
      lookup({
        properties: [
          {
            ...property('cap', 'Capacity'),
            valueType: 'FLOAT',
          } as PropertyDefinition,
        ],
      })
    );
    expect(parsed?.errors).toEqual([]);
    expect(parsed?.properties.cap).toBe(12.5);
  });
});

describe('a property cell is read as the type its definition declares', () => {
  const def = (
    valueType: string,
    allowed: string | null = null
  ): Parameters<typeof parsePropertyCell>[1] =>
    ({ valueType, allowedValues: allowed }) as Parameters<
      typeof parsePropertyCell
    >[1];

  it('reads a boolean as a boolean, not the word', () => {
    // The Details tab's checkbox tests for `true`; the string renders it
    // unchecked however the file spelled it.
    expect(parsePropertyCell('true', def('BOOLEAN'))).toBe(true);
    expect(parsePropertyCell('Yes', def('BOOLEAN'))).toBe(true);
    expect(parsePropertyCell('no', def('BOOLEAN'))).toBe(false);
    expect(parsePropertyCell('maybe', def('BOOLEAN'))).toBeUndefined();
  });

  it('reads numbers as numbers, whole ones for an integer', () => {
    expect(parsePropertyCell('12.7', def('FLOAT'))).toBe(12.7);
    expect(parsePropertyCell('12.7', def('INTEGER'))).toBe(12);
    expect(parsePropertyCell('-4', def('FLOAT'))).toBe(-4);
    expect(parsePropertyCell('lots', def('INTEGER'))).toBeUndefined();
  });

  it('holds a fixed-list property to its list, in the catalogue’s spelling', () => {
    const zone = def('STRING', 'Frozen, Chilled');
    expect(parsePropertyCell('chilled', zone)).toBe('Chilled');
    expect(parsePropertyCell('Tepid', zone)).toBeUndefined();
  });

  it('leaves free text alone', () => {
    expect(parsePropertyCell(' Danfoss ', def('STRING'))).toBe('Danfoss');
  });

  it('warns and drops an unreadable cell rather than failing the row', () => {
    const body = ['A-1', 'E003/059', '', '', '', '', '', '', '', '', 'nowhere'];
    const source = `${H},Climate zone\n${body.join(',')}\n`;
    const [row] = rowsOf(
      source,
      lookup({
        properties: [
          {
            ...property('zone', 'Climate zone'),
            allowedValues: 'Frozen, Chilled',
          } as PropertyDefinition,
        ],
      })
    );
    expect(row?.errors).toEqual([]);
    expect(row?.warnings).toContain('warning.field-not-parsed');
    expect(row?.properties.zone).toBeUndefined();
  });
});

describe('the store column', () => {
  const centralHeader = ['label.store', H].join(',');

  it('is read only where the destination offers it', () => {
    const rows = rowsOf(
      `${H}\nCCE-1,E003/059,,,,,,,,\n`,
      lookup({ isCentral: false })
    );
    expect(rows[0]?.storeId).toBeNull();
    expect(rows[0]?.errors).toEqual([]);
  });

  it('resolves a matching store code', () => {
    const rows = rowsOf(
      `${centralHeader}\nPS,CCE-1,E003/059,,,,,,,,\n`,
      lookup({ isCentral: true })
    );
    expect(rows[0]?.storeId).toBe('store-b');
  });

  it('fails a code matching no store', () => {
    const rows = rowsOf(
      `${centralHeader}\nNOPE,CCE-1,E003/059,,,,,,,,\n`,
      lookup({ isCentral: true })
    );
    expect(rows[0]?.errors).toContain('error.code-no-match');
  });

  it('accepts an omitted store — the asset stays on the acting store', () => {
    const rows = rowsOf(
      `${centralHeader}\n,CCE-1,E003/059,,,,,,,,\n`,
      lookup({ isCentral: true })
    );
    expect(rows[0]?.errors).toEqual([]);
    expect(rows[0]?.storeId).toBeNull();
  });
});

describe('OMS-REG-CCE-07.9 — a parsed row becomes an insert', () => {
  it('always names the cold-chain class', () => {
    const rows = rowsOf(`${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    expect(rowToInsertInput(rows[0]!, CCE_CLASS_ID).classId).toBe(CCE_CLASS_ID);
  });

  it('carries the catalogue item, the dates and the specification', () => {
    const rows = rowsOf(
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
    const rows = rowsOf(`${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    const input = rowToInsertInput(rows[0]!, CCE_CLASS_ID);
    expect(input.serialNumber).toBeNull();
    expect(input.notes).toBeNull();
  });

  it('omits the store where the row named none', () => {
    const rows = rowsOf(`${H}\nCCE-1,E003/059,,,,,,,,\n`, lookup());
    expect(rowToInsertInput(rows[0]!, CCE_CLASS_ID)).not.toHaveProperty(
      'storeId'
    );
  });
});

describe('OMS-REG-CCE-07.10 — the failed rows export', () => {
  it('appends the line number and the reason', () => {
    const rows = rowsOf(`${H}\n,NOPE,,,,,,,,\n`, lookup());
    const csv = failedRowsToCsv(rows, [], false);
    const header = csv.split('\r\n')[0] ?? '';
    expect(header).toContain('label.line-number');
    expect(header).toContain('label.error-message');
    expect(csv).toContain('error.code-no-match');
  });

  it('carries the line number a user reads in their spreadsheet', () => {
    const rows = rowsOf(`${H}\n,NOPE,,,,,,,,\n`, lookup());
    expect(failedRowsToCsv(rows, [], false)).toContain('2');
  });

  /*
   * The file exists to be corrected and re-uploaded, so what it writes must be
   * what the import reads. A cell written in a shape the parser rejects loses
   * data the user already had right — silently, because a bad date is a soft
   * warning rather than a refusal.
   */
  it('round-trips through the import: the dates and the flag survive', () => {
    const source = `${H}\nA-1,E003/059,05/10/2024,,,,SER-1,label.status-functioning,true,\n`;
    const [first] = rowsOf(source, lookup());
    expect(first?.installationDate).toBe('2024-10-05');
    expect(first?.needsReplacement).toBe(true);

    // Straight back out and in again — no hand-editing in between.
    const [round] = rowsOf(
      failedRowsToCsv([first as ImportRow], [], false),
      lookup()
    );
    expect(round?.installationDate).toBe('2024-10-05');
    expect(round?.needsReplacement).toBe(true);
    expect(round?.assetNumber).toBe('A-1');
  });
});

describe('OMS-REG-CCE-07.12 — the template', () => {
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
    const rows = rowsOf(buildTemplateCsv([], false), lookup());
    expect(rows).toHaveLength(1);
  });
});

describe('the review table sorts and filters in place', () => {
  const parse = (body: string) => rowsOf(`${H}\n${body}`, lookup());

  it('orders rows by a column, both ways', () => {
    const rows = parse('B-2,E003/059,,,,,,,,\nA-1,E003/059,,,,,,,,\n');
    const ascending = [...rows].sort((a, b) =>
      compareReviewRows(a, b, 'assetNumber')
    );
    expect(ascending.map(row => row.assetNumber)).toEqual(['A-1', 'B-2']);
    // Descending is the same comparison read backwards — the table negates it
    // rather than keeping a second ordering.
    expect([...ascending].reverse().map(row => row.assetNumber)).toEqual([
      'B-2',
      'A-1',
    ]);
  });

  it('sorts the replacement flag set-last, so the marked rows group', () => {
    const rows = parse('A-1,E003/059,,,,,,,true,\nB-2,E003/059,,,,,,,,\n');
    const sorted = [...rows].sort((a, b) =>
      compareReviewRows(a, b, 'needsReplacement')
    );
    expect(sorted.map(row => row.needsReplacement)).toEqual([false, true]);
  });

  it('searches every cell, including the reason a row was refused', () => {
    const [row] = parse(',NOPE,,,,,,,,\n');
    const text = reviewRowText(row as ImportRow);
    expect(text).toContain('nope');
    expect(text).toContain('error.code-no-match');
  });
});

describe('the store codes a file names are read BEFORE the parse', () => {
  /*
   * The lookup used to be a page of the register — 30 stores — matched
   * afterwards. On a server holding more than that the file's own store is
   * simply not on the page, so its code reported as unknown and a file this
   * app had just exported would not go back in. These pin that the codes come
   * off the FILE, so the fetch can ask for exactly them.
   */
  const withStore = (...codes: string[]) =>
    [
      [t('label.store'), t('label.asset-number'), t('label.catalogue-item-code')].join(','),
      ...codes.map((code, index) => `${code},A-${index},E003/059`),
    ].join('\r\n');

  it('reads every distinct code the file names', () => {
    expect(storeCodesIn(withStore('GRY', 'SLY'), true).sort()).toEqual([
      'GRY',
      'SLY',
    ]);
  });

  it('asks for one store once, however many rows name it', () => {
    expect(storeCodesIn(withStore('GRY', 'GRY', 'GRY'), true)).toEqual(['GRY']);
  });

  it('counts a code once whatever case the rows spell it in, and asks as the file spells it', () => {
    expect(storeCodesIn(withStore('GRY', 'gry'), true)).toEqual(['GRY']);
  });

  it('skips blank cells — an omitted store leaves the asset on the acting store', () => {
    expect(storeCodesIn(withStore('', 'GRY', ''), true)).toEqual(['GRY']);
  });

  it('reads nothing off a non-central server, where the column is not read at all', () => {
    expect(storeCodesIn(withStore('GRY'), false)).toEqual([]);
  });

  it('reads nothing from a file with no store column', () => {
    const file = [
      [t('label.asset-number'), t('label.catalogue-item-code')].join(','),
      'A-1,E003/059',
    ].join('\r\n');
    expect(storeCodesIn(file, true)).toEqual([]);
  });

  it('reads nothing from a file whose heading it cannot find — the parse reports that', () => {
    expect(storeCodesIn('nothing,here\r\n1,2', true)).toEqual([]);
  });

  it('finds the column under a banner row, like the parse does', () => {
    const file = [
      'Column1,Column2,Column3',
      [t('label.store'), t('label.asset-number'), t('label.catalogue-item-code')].join(','),
      'GRY,A-1,E003/059',
    ].join('\r\n');
    expect(storeCodesIn(file, true)).toEqual(['GRY']);
  });

  it('reads the separator the file used, like the parse does', () => {
    const file = [
      [t('label.store'), t('label.asset-number'), t('label.catalogue-item-code')].join(';'),
      'GRY;A-1;E003/059',
    ].join('\r\n');
    expect(storeCodesIn(file, true)).toEqual(['GRY']);
  });
});
