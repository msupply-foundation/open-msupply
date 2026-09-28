import { t, type LocaleKey } from '@/intl';
import { toCsv } from '@/domain/reportFiles';
import { parseImportDate, parseImportNumber } from '@/domain/csvImport';
import { mapInBatches, WRITE_CONCURRENCY } from '../batches';
import type {
  AssetPropertiesResult,
  InsertAssetCatalogueItemResult,
  InsertAssetCatalogueItemVariables,
} from './catalogueImport.generated';

// The catalogue import's rules, kept pure so they are tested without a screen
// (spec/asset-catalogue › rules § bulk import, S2): the template, how a file's
// rows are read and checked, the insert each row becomes, the reason a refused
// row carries, the per-row run, and the refused-rows file.

type Property = AssetPropertiesResult['assetProperties']['nodes'][number];
type Named = { id: string; name: string };
type InsertInput = InsertAssetCatalogueItemVariables['input'];

/** What a file's names are resolved against — the server's own lists. */
export interface CatalogueLookups {
  classes: readonly Named[];
  categories: readonly Named[];
  types: readonly Named[];
  properties: readonly Property[];
}

/** The seven item columns, in the template's order. They are read BY
 *  POSITION: the first seven cells, whatever their headings say. */
export const ITEM_HEADINGS: readonly LocaleKey[] = [
  'label.sub-catalogue',
  'label.code',
  'label.type',
  'label.manufacturer',
  'label.model',
  'label.class',
  'label.category',
];

/** One parsed row: its cells as uploaded (for the refused-rows file), the item
 *  it describes, and the failures the upload checks recorded against it. */
export interface ImportRow {
  cells: string[];
  subCatalogue: string;
  code: string;
  type: string;
  manufacturer: string;
  model: string;
  className: string;
  category: string;
  classId?: string;
  categoryId?: string;
  typeId?: string;
  properties: Record<string, string | number>;
  errors: string[];
}

export interface ParsedFile {
  header: string[];
  rows: ImportRow[];
}

/** Property keys once each, first-seen order — the definitions answer one row
 *  per scope, so a key recurs (contract § what the catalogue holds). */
export const distinctPropertyKeys = (
  properties: readonly Property[]
): string[] => [...new Set(properties.map(p => p.key))];

/** The template: the seven item columns, one column per distinct property
 *  key, and one example row. */
export const templateCsv = (properties: readonly Property[]): string => {
  const keys = distinctPropertyKeys(properties);
  return toCsv(
    [...ITEM_HEADINGS.map(key => t(key)), ...keys],
    [
      [
        'General',
        'A Unique Code for this item',
        'Refrigerator',
        'Some Manufacturer',
        'Some Model',
        'Cold chain equipment',
        'Refrigerators and freezers',
        ...keys.map(() => ''),
      ],
    ]
  );
};

/** `<instant>_<name>.csv` — how the template and the refused-rows file are
 *  named (neither is a store's list, so no store code). */
export const importFilename = (name: string, now: Date): string =>
  `${now.toISOString()}_${name}.csv`;

const required = (field: LocaleKey) =>
  t('error.field-must-be-specified', { field: t(field) });

const invalid = (field: string, value: string) =>
  t('error.invalid-field-value', { field, value });

const DATE = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

/** Read one property cell per its definition, recording any failure. Every
 *  definition is applied, so a key defined for several scopes is checked
 *  once per definition (README › captured as-is). */
const readProperty = (
  property: Property,
  value: string,
  row: ImportRow,
  decimalComma: boolean
): void => {
  if (property.allowedValues) {
    // Stored comma-and-space separated ("Integrated, External, None"); each
    // entry is read trimmed so every one is choosable (rules § bulk import).
    const allowed = property.allowedValues.split(',').map(v => v.trim());
    if (!allowed.includes(value))
      row.errors.push(invalid(property.name, value));
  }
  switch (property.valueType) {
    case 'INTEGER':
    case 'FLOAT': {
      const number = parseImportNumber(value, decimalComma);
      if (number === undefined) row.errors.push(invalid(property.name, value));
      else row.properties[property.key] = number;
      return;
    }
    case 'BOOLEAN': {
      const yes = ['true', 'yes'].includes(value.trim().toLowerCase());
      row.properties[property.key] = yes ? 'true' : 'false';
      return;
    }
    case 'DATE': {
      const date = DATE.test(value.trim()) ? parseImportDate(value) : null;
      if (date) row.properties[property.key] = date;
      else row.errors.push(invalid(property.name, value));
      return;
    }
    case 'STRING':
      row.properties[property.key] = value;
      return;
  }
};

/** Resolve a name cell against a list: required, then an exact name match. */
const resolve = (
  value: string,
  list: readonly Named[],
  field: LocaleKey,
  row: ImportRow
): string | undefined => {
  if (!value.trim()) {
    row.errors.push(required(field));
    return undefined;
  }
  const id = list.find(entry => entry.name === value)?.id;
  if (!id) row.errors.push(invalid(t(field), value));
  return id;
};

/** Parse a CSV table (heading row first) into checked rows. Blank lines are
 *  skipped. The upload checks are the UI's alone — the server repeats none. */
export const parseCatalogueRows = (
  table: readonly string[][],
  lookups: CatalogueLookups,
  /** A `;`-separated file comes from a decimal-comma locale, where `1,5` is
   *  one and a half — the sibling imports read it the same way. */
  decimalComma = false
): ParsedFile => {
  const header = table[0] ?? [];
  const columnOf = (property: Property): number => {
    const byName = header.indexOf(property.name);
    return byName !== -1 ? byName : header.indexOf(property.key);
  };
  const body = table
    .slice(1)
    .filter(cells => cells.some(cell => cell.trim() !== ''));

  const rows = body.map(cells => {
    const cell = (index: number) => cells[index] ?? '';
    const row: ImportRow = {
      cells: [...cells],
      subCatalogue: cell(0).trim(),
      code: cell(1),
      type: cell(2),
      manufacturer: cell(3),
      model: cell(4),
      className: cell(5),
      category: cell(6),
      properties: {},
      errors: [],
    };
    if (!row.subCatalogue) row.errors.push(required('label.sub-catalogue'));
    if (!row.code.trim())
      row.errors.push(required('label.catalogue-item-code'));
    row.classId = resolve(row.className, lookups.classes, 'label.class', row);
    row.categoryId = resolve(
      row.category,
      lookups.categories,
      'label.category',
      row
    );
    row.typeId = resolve(row.type, lookups.types, 'label.type', row);
    if (!row.model.trim()) row.errors.push(required('label.model'));
    for (const property of lookups.properties) {
      const index = columnOf(property);
      const value = index === -1 ? '' : cell(index);
      if (value.trim()) readProperty(property, value, row, decimalComma);
    }
    return row;
  });
  return { header: [...header], rows };
};

/** A file imports only when it has rows and none failed an upload check. */
export const canStartImport = (rows: readonly ImportRow[]): boolean =>
  rows.length > 0 && rows.every(row => row.errors.length === 0);

/** The insert a checked row becomes. A blank manufacturer is sent as none, so
 *  it never takes part in the manufacturer/model/type check. */
export const toInsertInput = (row: ImportRow, id: string): InsertInput => ({
  id,
  subCatalogue: row.subCatalogue,
  code: row.code,
  manufacturer: row.manufacturer.trim() ? row.manufacturer : null,
  model: row.model,
  classId: row.classId ?? '',
  categoryId: row.categoryId ?? '',
  typeId: row.typeId ?? '',
  properties: JSON.stringify(row.properties),
});

type InsertResponse =
  InsertAssetCatalogueItemResult['centralServer']['assetCatalogue']['insertAssetCatalogueItem'];

/** The reason a typed refusal carries, or undefined for an added item. */
export const insertRefusal = (response: InsertResponse): string | undefined => {
  if (response.__typename !== 'InsertAssetCatalogueItemError') return undefined;
  const { error } = response;
  switch (error.__typename) {
    case 'RecordAlreadyExist':
      return t('error.record-already-exists');
    case 'UniqueValueViolation':
      return error.field === 'code'
        ? t('error.unique-value-violation', { field: t('label.code') })
        : error.description;
    case 'UniqueCombinationViolation':
      return t('error.manufacturer-model-unique');
    default: {
      // The generated union omits members the schema's error interface has
      // (InternalError, DatabaseError), so this is not truly exhaustive: an
      // unexpected member is named by its own description, never thrown.
      const unexpected: { description?: string } = error;
      return unexpected.description ?? t('messages.unknown-error');
    }
  }
};

/** Rows are sent this many at a time; nothing batches or rolls back across
 *  them (contract § bulk import). */
export const IMPORT_CONCURRENCY = WRITE_CONCURRENCY;

export interface RunProgress {
  sent: number;
  total: number;
  refused: number;
}

export interface RefusedRow {
  row: ImportRow;
  reason: string;
}

/** Add each row as its own item. `insertOne` resolves to undefined for an
 *  added row, else the refusal's reason. Refused rows come back in file
 *  order. */
export const runImport = async (
  rows: readonly ImportRow[],
  insertOne: (row: ImportRow) => Promise<string | undefined>,
  onProgress: (progress: RunProgress) => void = () => {}
): Promise<RefusedRow[]> => {
  const reasons = await mapInBatches(rows, insertOne, sofar =>
    onProgress({
      sent: sofar.length,
      total: rows.length,
      refused: sofar.filter(r => r !== undefined).length,
    })
  );
  return rows.flatMap((row, index) => {
    const reason = reasons[index];
    return reason === undefined ? [] : [{ row, reason }];
  });
};

/** What the review's search matches a row by: its seven item cells and its
 *  message, in any case (the equipment import's review searches the same way). */
export const importRowText = (row: ImportRow, message: string): string =>
  [
    row.subCatalogue,
    row.code,
    row.type,
    row.manufacturer,
    row.model,
    row.className,
    row.category,
    message,
  ]
    .join(' ')
    .toLowerCase();

/** A row's failures as one comma-separated message. */
export const errorMessage = (errors: readonly string[]): string =>
  errors.join(', ');

/** The downloadable rows: the upload's own columns, in its order, with an
 *  Error message column appended — so the file can be corrected and uploaded
 *  again. */
export const rowsCsv = (
  header: readonly string[],
  rows: readonly { cells: string[]; message: string }[]
): string => {
  const width = Math.max(header.length, ...rows.map(r => r.cells.length));
  const pad = (cells: readonly string[]) =>
    Array.from({ length: width }, (_, i) => cells[i] ?? '');
  return toCsv(
    [...pad(header), t('label.error-message')],
    rows.map(r => [...pad(r.cells), r.message])
  );
};
