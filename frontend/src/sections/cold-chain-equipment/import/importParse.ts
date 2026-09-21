import { t } from '@/intl';
import { parseCsv, sniffSeparator, toCsv } from '@/domain/reportFiles';
import { ASSET_STATUSES, statusLabelKey } from '../equipment';
import type { AssetStatus } from '../equipment';
import type { PropertyDefinition } from '../detail/assetProperties';
import { allowedValues, applicableProperties } from '../detail/assetProperties';
import type { PropertyValues } from '../detail/assetEdit';

/*
 * Pure logic for the equipment BULK IMPORT (spec/cold-chain-equipment § bulk
 * import, ui-surface S4). Everything the import decides — what the template
 * carries, which file is accepted, what makes a row fail as against merely
 * warn, and what each row creates — lives here, framework-free and
 * unit-testable in node. `EquipmentImportModal` owns only the steps, the
 * requests, and the banner.
 *
 * Nothing about the import is server-side: there is no bulk mutation and no
 * server-side validation of the file (contract § bulk import). Partial
 * application is therefore the contract, not a failure mode.
 */

/** Only a comma-separated-values file is accepted, judged by its NAME (OMS-REG-CCE-07.1). */
export const isCsvFileName = (fileName: string): boolean =>
  fileName.trim().toLowerCase().endsWith('.csv');

export const CSV_ACCEPT = '.csv,text/csv';

/** Rows are created in batches, with no rollback across them. */
export const IMPORT_BATCH_SIZE = 100;

/**
 * A parsed row. `errors` block the import; `warnings` do not — a blank or
 * unreadable date costs the row that value and nothing more (OMS-REG-CCE-07.6).
 */
export type ImportRow = {
  /** The client-side id the asset will be created with. */
  id: string;
  lineNumber: number;
  assetNumber: string;
  catalogueItemCode: string;
  catalogueItemId: string | null;
  storeCode: string;
  storeId: string | null;
  serialNumber: string;
  notes: string;
  installationDate: string | null;
  replacementDate: string | null;
  warrantyStart: string | null;
  warrantyEnd: string | null;
  status: AssetStatus;
  needsReplacement: boolean;
  properties: PropertyValues;
  errors: string[];
  warnings: string[];
};

/**
 * The import's own columns, in order. Header matching is by the SAME catalog
 * labels the template writes, so a template round-trips.
 */
export const importColumnKeys = (isCentral: boolean): string[] => [
  ...(isCentral ? [t('label.store')] : []),
  t('label.asset-number'),
  t('label.catalogue-item-code'),
  t('label.installation-date'),
  t('label.replacement-date'),
  t('label.warranty-start-date'),
  t('label.warranty-end-date'),
  t('label.serial'),
  t('label.functional-status'),
  t('label.needs-replacement'),
  t('label.asset-notes'),
];

/**
 * The downloadable template (OMS-REG-CCE-07.12): a header row of the import's own columns
 * plus one per specification key, and a single example row showing the date
 * format each date column expects.
 */
export const buildTemplateCsv = (
  propertyKeys: readonly string[],
  isCentral: boolean
): string => {
  const keys = [...new Set(propertyKeys)];
  const fields = [...importColumnKeys(isCentral), ...keys];
  const dateFormat = t('label.date-format');
  const example = [
    ...(isCentral ? [''] : []),
    t('label.asset-number').toUpperCase(),
    '',
    dateFormat,
    dateFormat,
    dateFormat,
    dateFormat,
    '',
    t(statusLabelKey('FUNCTIONING')),
    '',
    '',
    ...keys.map(() => ''),
  ];
  return toCsv(fields, [example]);
};

/**
 * A date cell → the ISO day the wire wants, or null.
 *
 * Three shapes, because three are what a spreadsheet actually hands back:
 * `DD/MM/YYYY` (what our template asks for), `DD-MM-YYYY` (the same day with
 * the separator Excel substitutes under many Windows locales), and
 * `YYYY-MM-DD` (ISO, which the server itself already accepts for the mapping
 * dates — see contract § temperature mapping, so refusing it here made the
 * client stricter than the wire it writes to).
 *
 * `MM/DD/YYYY` is deliberately NOT read: `05/10/2026` is a real date under both
 * readings and nothing in the file says which was meant, so guessing would
 * silently import the wrong day. It falls to the warning path, where the user
 * sees the value was dropped.
 *
 * Whichever shape, the **year must be four digits** — a two-digit year is
 * exactly what this rule exists to catch, because `05/10/24` would otherwise
 * import as the year 24 (OMS-REG-CCE-07.7).
 */
export const parseImportDate = (value: string): string | null => {
  const trimmed = value.trim();
  // ISO leads with its four-digit year, which is what tells it apart from a
  // day-first date using the same separator — no ambiguity to resolve.
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(trimmed);
  const parts = iso ? [iso[3]!, iso[2]!, iso[1]!] : trimmed.split(/[/\-.]/);
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!year || year.length !== 4) return null;
  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  if (!dayNumber || !monthNumber || !yearNumber) return null;
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31)
    return null;
  const date = new Date(yearNumber, monthNumber - 1, dayNumber);
  // Rejects an impossible day that would otherwise roll over (31/02/2024).
  if (date.getMonth() !== monthNumber - 1 || date.getDate() !== dayNumber)
    return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${yearNumber}-${pad(monthNumber)}-${pad(dayNumber)}`;
};

/**
 * A status cell → one of the six, matched against their own catalog labels
 * case-insensitively. Anything that matches none falls back to _Functioning_
 * (OMS-REG-CCE-07.8) — an unreadable status is not worth failing a row over.
 */
export const parseImportStatus = (value: string): AssetStatus => {
  const normalised = value.trim().toLowerCase();
  if (!normalised) return 'FUNCTIONING';
  const match = ASSET_STATUSES.find(
    status => t(statusLabelKey(status)).toLowerCase() === normalised
  );
  return match ?? 'FUNCTIONING';
};

/**
 * A cell that answers yes or no → the answer, or `undefined` where it does not
 * answer at all.
 *
 * ONE vocabulary for every boolean a file can carry, because a file carries
 * them in one column and the app read them in two: the raw `true`/`false` the
 * current app exports, the plain words a user types, and the `Yes`/`No` this
 * app's own export writes IN THE READER'S LANGUAGE. Split, a Russian user's
 * `Да` set the replacement flag and was dropped from a boolean specification
 * column one cell over, and a `1` did the reverse — the same silent mismatch
 * this vertical keeps turning up.
 */
const AFFIRMATIVE = /^(true|yes|y|1)$/i;
const NEGATIVE = /^(false|no|n|0)$/i;

export const parseImportBoolean = (raw: string): boolean | undefined => {
  const value = raw.trim();
  if (!value) return undefined;
  if (AFFIRMATIVE.test(value)) return true;
  if (NEGATIVE.test(value)) return false;
  const lower = value.toLowerCase();
  if (lower === t('messages.yes').trim().toLowerCase()) return true;
  if (lower === t('messages.no').trim().toLowerCase()) return false;
  return undefined;
};

/**
 * A numeric cell → a number, or `undefined` where it does not read as one.
 *
 * A dot is always the decimal mark. A comma is the decimal mark too — `12,5`
 * is twelve and a half — UNLESS it is doing a thousands separator's job, which
 * only one shape can be: digits grouped in threes (`1,234`, `12,345,678`) in a
 * file that is itself comma-separated. That last condition matters because the
 * grouped shape is genuinely ambiguous (`1,234` is also one-and-a-bit in half
 * of Europe), and the file's own separator is the best evidence there is: a
 * spreadsheet writing `;` between fields does so BECAUSE its locale took the
 * comma for the decimal mark. `decimalComma` is that fact about the file, and
 * ONLY a semicolon carries it — a tab is chosen for reasons of its own and says
 * nothing about the decimal mark, so a tab file groups like a comma file.
 *
 * What the separator is NOT allowed to do is turn an unambiguous decimal into a
 * thousand: `12,5` cannot be a grouped number in any convention, so it reads as
 * 12.5 in a comma file too. Google Sheets writes exactly that — it always
 * downloads comma-separated CSV whatever the sheet's locale, with cells as
 * displayed — and stripping the comma there would import 125 without a word.
 *
 * Where a value carries BOTH marks the question does not arise — the LAST one
 * is the decimal, whichever file it came from (`1.234,56` and `1,234.56` are
 * the same number written twice).
 */
export const parseImportNumber = (
  raw: string,
  decimalComma = false
): number | undefined => {
  // `\s` already covers the no-break space a spreadsheet groups with.
  const value = raw.trim().replace(/\s/g, '');
  if (!value) return undefined;
  if (!/^[+-]?[\d.,]+$/.test(value)) return undefined;

  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');
  let normalised: string;
  if (lastComma !== -1 && lastDot !== -1) {
    // Both present: the rightmost mark is the decimal point, the other groups.
    normalised =
      lastComma > lastDot
        ? value.replace(/\./g, '').replace(',', '.')
        : value.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // The one shape a thousands separator can take, in the one kind of file
    // where the comma is free to be one.
    const grouped = !decimalComma && /^[+-]?\d{1,3}(,\d{3})+$/.test(value);
    normalised = grouped ? value.replace(/,/g, '') : value.replace(',', '.');
  } else {
    normalised = value;
  }

  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * A property cell → the value its DEFINITION declares, or `undefined` where the
 * cell does not answer it.
 *
 * Stored raw, every value would be a string — and a string is not what the
 * screen or the wire expect: a boolean property imported as `"true"` renders
 * unchecked on the Details tab (the checkbox tests for `true`, not for the
 * word), and a number imported as text sorts and totals as text. A cell
 * outside a property's allowed values is refused rather than stored, because
 * the value would be one nothing else in the app can produce.
 *
 * Soft, like the dates: an unreadable cell warns and is dropped, never failing
 * the row (OMS-REG-CCE-07.6).
 */
export const parsePropertyCell = (
  raw: string,
  definition: Pick<PropertyDefinition, 'valueType' | 'allowedValues'>,
  decimalComma = false
): string | number | boolean | undefined => {
  const value = raw.trim();
  if (!value) return undefined;

  if (definition.valueType === 'BOOLEAN') return parseImportBoolean(value);

  if (definition.valueType === 'INTEGER' || definition.valueType === 'FLOAT') {
    const parsed = parseImportNumber(value, decimalComma);
    if (parsed === undefined) return undefined;
    return definition.valueType === 'INTEGER' ? Math.trunc(parsed) : parsed;
  }

  // A text property that declares a fixed list only accepts one of them,
  // matched case-insensitively and returned in the catalogue's own spelling so
  // the stored value matches what the picker offers.
  const permitted = allowedValues(definition);
  if (permitted) {
    return permitted.find(
      option => option.toLowerCase() === value.toLowerCase()
    );
  }
  return value;
};

/**
 * The replacement flag.
 *
 * Reads the vocabulary a user's file actually carries, not one spelling of it.
 * `true` is what the import's own failed-rows file writes; **`Yes` is what the
 * list EXPORT writes**, so without it an asset exported and re-imported came
 * back with the flag silently cleared — a round trip that loses data is worse
 * than one that refuses. The translated yes is matched too, so a file exported
 * in the user's own language re-imports in it.
 *
 * Purely additive: every value that set the flag before still sets it.
 */
// The flag is a boolean, never absent: a cell that answers nothing means the
// asset is not flagged. The substring match stays because the import's own
// failed-rows file has always written a bare `true`.
export const parseNeedsReplacement = (value: string): boolean =>
  /true/i.test(value) || parseImportBoolean(value) === true;

type Lookup = {
  catalogueItems: readonly { id: string; code: string }[];
  stores: readonly { id: string; code?: string | null }[];
  properties: readonly PropertyDefinition[];
  isCentral: boolean;
  /** Ids for the assets the rows will create — one per body row, in order. */
  newId: (index: number) => string;
};

/**
 * Which row of the file names the columns.
 *
 * Normally the first — but files arrive with a generic banner row of their own
 * (`Column1 … ColumnN`) above the real names, written by whatever tool last
 * handled them; Power Query does it when a header is not promoted, and it is
 * not a shape a user can see is wrong, because on screen the file still looks
 * like the one they were given. We have a real file that arrived this way
 * whose author says they did not put the row there, so this treats the shape
 * as something to read past rather than a particular tool's signature.
 *
 * So the header is the first row naming at least one column the import knows.
 * That is a decision, not a guess — the names are our own, written by our own
 * template — and it fails loudly rather than silently: a file where NO row
 * names a known column returns -1, and the caller refuses the whole file
 * instead of reporting every row as missing values it plainly has.
 *
 * Only the first few rows are considered; a banner is a line or two, and
 * scanning further would start finding "headers" in data.
 */
const HEADER_SCAN_ROWS = 5;

export const findHeaderRow = (
  table: readonly string[][],
  knownColumns: readonly string[]
): number => {
  const known = new Set(knownColumns.map(name => name.trim().toLowerCase()));
  const limit = Math.min(table.length, HEADER_SCAN_ROWS);
  for (let index = 0; index < limit; index++) {
    const names = table[index] ?? [];
    if (names.some(name => known.has(name.trim().toLowerCase()))) return index;
  }
  return -1;
};

/**
 * Why a file yields no rows — or `null` when it would yield some.
 *
 * Two faults look the same from the outside (an empty review) and need
 * different remedies, so the modal asks which before it says anything:
 * `no-header` is a file in which no row names a column the import knows (a
 * spreadsheet's `Column1 … ColumnN` banner with nothing real beneath it, or a
 * file exported under another language); `no-rows` is a heading the import DOES
 * know with nothing under it — the template with its example row deleted, or
 * an export of an empty register. Telling the second user their columns are
 * wrong would send them to compare a heading that already matches.
 */
export type ImportFileFailure = 'no-header' | 'no-rows';

type ImportTable = {
  header: string[];
  body: string[][];
  /** Where the heading sits in the file, 0-based. */
  headerIndex: number;
  /** The file writes `12,5` for twelve and a half (see parseImportNumber). */
  decimalComma: boolean;
};

/*
 * Read the file into its heading and body, or say why it cannot be. The
 * separator is sniffed ONCE here and handed to the reader, then kept, because
 * it also says which numeric convention the file is written in.
 */
const readImportTable = (
  text: string,
  isCentral: boolean
): ImportTable | ImportFileFailure => {
  const separator = sniffSeparator(text);
  const table = parseCsv(text, separator);
  const headerIndex = findHeaderRow(table, importColumnKeys(isCentral));
  if (headerIndex === -1) return 'no-header';
  const [header = [], ...body] = table.slice(headerIndex);
  if (body.length === 0) return 'no-rows';
  // Only `;` is evidence. The argument for reading a comma as a decimal mark is
  // that a spreadsheet reaches for the semicolon BECAUSE its locale took the
  // comma — a tab says nothing either way, and treating it as evidence turned a
  // grouped thousand from an en-locale sheet into one-and-a-bit, silently.
  return { header, body, headerIndex, decimalComma: separator === ';' };
};

/**
 * Parse the uploaded file into rows, each carrying its own errors and warnings
 * — or say why the file yields none.
 *
 * Header matching is by column NAME, so a column the file does not carry simply
 * reads as blank, which is why the required columns are checked per row rather
 * than up front.
 *
 * The two outcomes are returned TOGETHER rather than flattening a failure to an
 * empty list and making the caller ask again: the read already knows which
 * fault it hit, and asking a second time meant parsing the whole file twice to
 * recover an answer that had been thrown away. `Array.isArray` tells them
 * apart.
 */
export const parseImportFile = (
  text: string,
  lookup: Lookup
): ImportRow[] | ImportFileFailure => {
  const read = readImportTable(text, lookup.isCentral);
  if (typeof read === 'string') return read;
  const { header, body, headerIndex, decimalComma } = read;
  const columnAt = new Map(
    header.map((name, index) => [name.trim().toLowerCase(), index])
  );
  const cell = (cells: string[], name: string): string => {
    const index = columnAt.get(name.trim().toLowerCase());
    return index === undefined ? '' : (cells[index] ?? '').trim();
  };

  const itemsByCode = new Map(
    lookup.catalogueItems.map(item => [item.code.trim().toLowerCase(), item])
  );
  const storesByCode = new Map(
    lookup.stores
      .filter(store => store.code)
      .map(store => [store.code!.trim().toLowerCase(), store])
  );
  const definitions = applicableProperties(lookup.properties);

  // Asset numbers must be unique WITHIN THE FILE (OMS-REG-CCE-07.4), so both sides of a
  // duplicate are named — a first pass counts them.
  const numberCounts = new Map<string, number>();
  for (const cells of body) {
    const value = cell(cells, t('label.asset-number')).toLowerCase();
    if (value) numberCounts.set(value, (numberCounts.get(value) ?? 0) + 1);
  }

  return body.map((cells, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const assetNumber = cell(cells, t('label.asset-number'));
    if (!assetNumber) {
      errors.push(
        t('error.field-must-be-specified', { field: t('label.asset-number') })
      );
    } else if ((numberCounts.get(assetNumber.toLowerCase()) ?? 0) > 1) {
      errors.push(
        t('error.duplicated-field', { field: t('label.asset-number') })
      );
    }

    const catalogueItemCode = cell(cells, t('label.catalogue-item-code'));
    let catalogueItemId: string | null = null;
    if (!catalogueItemCode) {
      errors.push(
        t('error.field-must-be-specified', {
          field: t('label.catalogue-item-code'),
        })
      );
    } else {
      const item = itemsByCode.get(catalogueItemCode.toLowerCase());
      if (!item) {
        errors.push(
          t('error.code-no-match', { field: t('label.catalogue-item-code') })
        );
      } else catalogueItemId = item.id;
    }

    // The store column is optional even where it is offered — an omitted one
    // leaves the asset on the acting store.
    const storeCode = lookup.isCentral ? cell(cells, t('label.store')) : '';
    let storeId: string | null = null;
    if (storeCode) {
      const store = storesByCode.get(storeCode.toLowerCase());
      if (!store) {
        errors.push(t('error.code-no-match', { field: t('label.store') }));
      } else storeId = store.id;
    }

    /*
     * The four dates are SOFT: an unreadable one warns and the row imports
     * without it (OMS-REG-CCE-07.6/.7).
     *
     * An EMPTY one says nothing at all. All four are optional, so a blank is an
     * answer — "no warranty recorded" — not a value we failed to read, and
     * warning about it fired the banner on the most ordinary file there is. A
     * warning every user learns to dismiss is worse than no warning, because it
     * takes the real ones down with it.
     */
    const softDate = (label: string): string | null => {
      const raw = cell(cells, label);
      if (!raw) return null;
      const parsed = parseImportDate(raw);
      if (!parsed) {
        warnings.push(t('warning.field-not-parsed', { field: label }));
        return null;
      }
      return parsed;
    };

    const properties: PropertyValues = {};
    for (const definition of definitions) {
      // A property column is headed by the property's own display name.
      const raw = cell(cells, definition.name);
      if (raw) {
        const value = parsePropertyCell(raw, definition, decimalComma);
        if (value === undefined)
          warnings.push(
            t('warning.field-not-parsed', { field: definition.name })
          );
        else properties[definition.key] = value;
      }
    }

    return {
      id: lookup.newId(index),
      // The number a user reads in their spreadsheet: rows are 1-based, the
      // header sits at `headerIndex`, and the first body row is the line after
      // it. Counted from the header's real position rather than from 1, so a
      // banner row above it does not shift every reported line by one.
      lineNumber: headerIndex + index + 2,
      assetNumber,
      catalogueItemCode,
      catalogueItemId,
      storeCode,
      storeId,
      serialNumber: cell(cells, t('label.serial')),
      notes: cell(cells, t('label.asset-notes')),
      installationDate: softDate(t('label.installation-date')),
      replacementDate: softDate(t('label.replacement-date')),
      warrantyStart: softDate(t('label.warranty-start-date')),
      warrantyEnd: softDate(t('label.warranty-end-date')),
      status: parseImportStatus(cell(cells, t('label.functional-status'))),
      needsReplacement: parseNeedsReplacement(
        cell(cells, t('label.needs-replacement'))
      ),
      properties,
      errors,
      warnings,
    };
  });
};

/** Any row error blocks the import; warnings do not (OMS-REG-CCE-07.3/.6). */
export const hasErrors = (rows: readonly ImportRow[]): boolean =>
  rows.some(row => row.errors.length > 0);

export const hasWarnings = (rows: readonly ImportRow[]): boolean =>
  rows.some(row => row.warnings.length > 0);

export const canImport = (rows: readonly ImportRow[]): boolean =>
  rows.length > 0 && !hasErrors(rows);

/**
 * A parsed row → the insert input that creates its asset.
 *
 * `classId` is always sent, and the catalogue item carries the rest of the
 * classification — an unclassified insert fails as a foreign-key error rather
 * than a stated one (contract ⚠️ wire trap).
 */
export const rowToInsertInput = (
  row: ImportRow,
  classId: string
): {
  id: string;
  classId: string;
  assetNumber: string;
  catalogueItemId: string | null;
  serialNumber: string | null;
  notes: string | null;
  installationDate: string | null;
  replacementDate: string | null;
  warrantyStart: string | null;
  warrantyEnd: string | null;
  needsReplacement: boolean;
  properties: string;
  storeId?: string;
} => ({
  id: row.id,
  classId,
  assetNumber: row.assetNumber,
  catalogueItemId: row.catalogueItemId,
  serialNumber: row.serialNumber || null,
  notes: row.notes || null,
  installationDate: row.installationDate,
  replacementDate: row.replacementDate,
  warrantyStart: row.warrantyStart,
  warrantyEnd: row.warrantyEnd,
  needsReplacement: row.needsReplacement,
  properties: JSON.stringify(row.properties),
  ...(row.storeId ? { storeId: row.storeId } : {}),
});

/**
 * A stored ISO day (`YYYY-MM-DD`) back to the `DD/MM/YYYY` the import reads.
 *
 * The failed-rows file is meant to be FIXED and re-uploaded, so every cell it
 * writes must be one {@link parseImportDate} accepts — an ISO day would come
 * back as a warning and an empty date, quietly losing what the user got right.
 */
const toImportDate = (iso: string | null): string => {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
};

/**
 * The failed rows as a CSV for fixing offline (OMS-REG-CCE-07.10) — the import's own
 * columns, plus the line number and the reason each row was refused.
 *
 * Every cell round-trips through this module's own parsers: the file exists to
 * be corrected and re-uploaded, and a column it writes in a shape the import
 * cannot read loses the user's data on the way back in.
 */
export const failedRowsToCsv = (
  rows: readonly ImportRow[],
  propertyKeys: readonly string[],
  isCentral: boolean
): string => {
  const keys = [...new Set(propertyKeys)];
  const fields = [
    ...importColumnKeys(isCentral),
    t('label.line-number'),
    ...keys,
    t('label.error-message'),
  ];
  const data = rows.map(row => [
    ...(isCentral ? [row.storeCode] : []),
    row.assetNumber,
    row.catalogueItemCode,
    toImportDate(row.installationDate),
    toImportDate(row.replacementDate),
    toImportDate(row.warrantyStart),
    toImportDate(row.warrantyEnd),
    row.serialNumber,
    t(statusLabelKey(row.status)),
    // The word the flag's own parser looks for, not a tick: `X` reads back as
    // false.
    row.needsReplacement ? 'true' : '',
    row.notes,
    row.lineNumber,
    ...keys.map(key => String(row.properties[key] ?? '')),
    row.errors.join(', '),
  ]);
  return toCsv(fields, data);
};

/**
 * What the review table sorts by — the parsed row's own fields, not the wire's
 * (nothing here has reached the server yet).
 */
export type ReviewSortKey =
  | 'storeCode'
  | 'assetNumber'
  | 'catalogueItemCode'
  | 'installationDate'
  | 'replacementDate'
  | 'warrantyStart'
  | 'warrantyEnd'
  | 'serialNumber'
  | 'status'
  | 'needsReplacement'
  | 'notes';

/** Every cell of a row as one lowercase haystack, for the review search. */
export const reviewRowText = (row: ImportRow): string =>
  [
    row.storeCode,
    row.assetNumber,
    row.catalogueItemCode,
    row.serialNumber,
    row.notes,
    t(statusLabelKey(row.status)),
    row.installationDate ?? '',
    row.replacementDate ?? '',
    row.warrantyStart ?? '',
    row.warrantyEnd ?? '',
    ...Object.values(row.properties).map(value => String(value ?? '')),
    ...row.errors,
    ...row.warnings,
  ]
    .join(' ')
    .toLowerCase();

/**
 * Order two review rows by one key.
 *
 * Dates are held as ISO days, which sort correctly as text; the flag sorts
 * set-last so "which of these will be replaced" reads as a block; everything
 * else compares as text, case-insensitively, the way a user reads it.
 */
export const compareReviewRows = (
  a: ImportRow,
  b: ImportRow,
  key: ReviewSortKey
): number => {
  if (key === 'needsReplacement')
    return Number(a.needsReplacement) - Number(b.needsReplacement);
  const text = (row: ImportRow): string => {
    if (key === 'status') return t(statusLabelKey(row.status));
    return String(row[key] ?? '');
  };
  return text(a).localeCompare(text(b), undefined, { sensitivity: 'base' });
};
