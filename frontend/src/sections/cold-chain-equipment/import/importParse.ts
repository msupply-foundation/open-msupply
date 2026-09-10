import { t } from '@/intl';
import { parseCsv, toCsv } from '@/domain/reportFiles';
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

/** Only a comma-separated-values file is accepted, judged by its NAME (AC-I1). */
export const isCsvFileName = (fileName: string): boolean =>
  fileName.trim().toLowerCase().endsWith('.csv');

export const CSV_ACCEPT = '.csv,text/csv';

/** Rows are created in batches, with no rollback across them. */
export const IMPORT_BATCH_SIZE = 100;

/**
 * A parsed row. `errors` block the import; `warnings` do not — a blank or
 * unreadable date costs the row that value and nothing more (AC-I6).
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
 * The downloadable template (AC-I11): a header row of the import's own columns
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
 * `DD/MM/YYYY`, and the **year must be four digits** — a two-digit year is
 * exactly what this rule exists to catch, because `05/10/24` would otherwise
 * import as the year 24 (AC-I7).
 */
export const parseImportDate = (value: string): string | null => {
  const parts = value.trim().split('/');
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
 * (AC-I8) — an unreadable status is not worth failing a row over.
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
 * the row (AC-I6).
 */
export const parsePropertyCell = (
  raw: string,
  definition: Pick<PropertyDefinition, 'valueType' | 'allowedValues'>
): string | number | boolean | undefined => {
  const value = raw.trim();
  if (!value) return undefined;

  if (definition.valueType === 'BOOLEAN') {
    if (/^(true|yes|y|1)$/i.test(value)) return true;
    if (/^(false|no|n|0)$/i.test(value)) return false;
    return undefined;
  }

  if (definition.valueType === 'INTEGER' || definition.valueType === 'FLOAT') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return undefined;
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

/** The replacement flag reads as set for any value containing "true". */
export const parseNeedsReplacement = (value: string): boolean =>
  /true/i.test(value);

type Lookup = {
  catalogueItems: readonly { id: string; code: string }[];
  stores: readonly { id: string; code?: string | null }[];
  properties: readonly PropertyDefinition[];
  isCentral: boolean;
  /** Ids for the assets the rows will create — one per body row, in order. */
  newId: (index: number) => string;
};

/**
 * Parse the uploaded file into rows, each carrying its own errors and warnings.
 *
 * Header matching is by column NAME, so a column the file does not carry simply
 * reads as blank — which is why the required columns are checked per row rather
 * than up front.
 */
export const parseImportFile = (
  text: string,
  lookup: Lookup
): ImportRow[] => {
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const [header = [], ...body] = table;
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

  // Asset numbers must be unique WITHIN THE FILE (AC-I4), so both sides of a
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

    // The four dates are SOFT: a blank or unreadable one warns and the row
    // imports without it (AC-I6/AC-I7).
    const softDate = (label: string): string | null => {
      const raw = cell(cells, label);
      if (!raw) {
        warnings.push(t('warning.field-not-parsed', { field: label }));
        return null;
      }
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
        const value = parsePropertyCell(raw, definition);
        if (value === undefined)
          warnings.push(
            t('warning.field-not-parsed', { field: definition.name })
          );
        else properties[definition.key] = value;
      }
    }

    return {
      id: lookup.newId(index),
      // +2: the header is line 1 and rows are 1-based, so the first body row
      // is the file's line 2 — the number a user reads in their spreadsheet.
      lineNumber: index + 2,
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

/** Any row error blocks the import; warnings do not (AC-I3/AC-I6). */
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
 * The failed rows as a CSV for fixing offline (AC-I10) — the import's own
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
