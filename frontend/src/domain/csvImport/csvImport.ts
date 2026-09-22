// What every CSV bulk import shares (equipment, facility properties, purchase
// order lines): which file is accepted, how a heading is found under a banner,
// how a number and a date cell are read, and what blocks a run. Each import
// keeps its own columns, row shape and row rules beside its modal.

/** Only a comma-separated-values file is accepted, judged by its NAME. */
export const isCsvFileName = (fileName: string): boolean =>
  fileName.trim().toLowerCase().endsWith('.csv');

/** The `accept` list handed to the upload zone — extension and MIME alike. */
export const CSV_ACCEPT = '.csv,text/csv';

/** Rows are created in batches, with no rollback across them. */
export const IMPORT_BATCH_SIZE = 100;

/**
 * Why a file yields no rows: `no-header` — no row names a column the import
 * knows (a file exported under another language, or a spreadsheet's
 * `Column1 … ColumnN` banner with nothing real beneath); `no-rows` — a heading
 * the import does know with nothing under it.
 */
export type ImportFileFailure = 'no-header' | 'no-rows';

/**
 * The header is the first row naming at least one column the import knows —
 * a spreadsheet may sit a banner above it. Only the first few rows are
 * considered; scanning further would start finding "headers" in data. -1
 * where no row qualifies, so the caller refuses the whole file.
 */
export const findHeaderRow = (
  table: readonly string[][],
  knownColumns: readonly string[],
  scanRows = 5
): number => {
  const known = new Set(knownColumns.map(name => name.trim().toLowerCase()));
  const limit = Math.min(table.length, scanRows);
  for (let index = 0; index < limit; index++) {
    const names = table[index] ?? [];
    if (names.some(name => known.has(name.trim().toLowerCase()))) return index;
  }
  return -1;
};

/**
 * A numeric cell → a number, or `undefined` where it does not read as one.
 *
 * A dot is always the decimal mark. A comma is the decimal mark too (`12,5`)
 * UNLESS it is plainly grouping thousands — digits in threes (`1,234`) in a
 * file that is itself comma-separated. `decimalComma` says the file uses `;`
 * between fields, which a spreadsheet does BECAUSE its locale took the comma
 * for the decimal mark; a tab file groups like a comma file. Where both marks
 * appear the LAST one is the decimal (`1.234,56` and `1,234.56` agree).
 */
export const parseImportNumber = (
  raw: string,
  decimalComma = false
): number | undefined => {
  const value = raw.trim().replace(/\s/g, '');
  if (!value) return undefined;
  if (!/^[+-]?[\d.,]+$/.test(value)) return undefined;

  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');
  let normalised: string;
  if (lastComma !== -1 && lastDot !== -1) {
    normalised =
      lastComma > lastDot
        ? value.replace(/\./g, '').replace(',', '.')
        : value.replace(/,/g, '');
  } else if (lastComma !== -1) {
    const grouped = !decimalComma && /^[+-]?\d{1,3}(,\d{3})+$/.test(value);
    normalised = grouped ? value.replace(/,/g, '') : value.replace(',', '.');
  } else {
    normalised = value;
  }

  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * A date cell → the ISO day the wire wants, or null. Day-first with `/`, `-`
 * or `.` (what a spreadsheet hands back under most locales), or ISO, which
 * leads with its four-digit year. `MM/DD/YYYY` is deliberately NOT read:
 * `05/10/2026` is a real date under both readings, so it falls to the caller's
 * warning path. Whichever shape, the year must have four digits — `05/10/24`
 * would otherwise import as the year 24.
 */
export const parseImportDate = (value: string): string | null => {
  const trimmed = value.trim();
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

export type ImportRowVerdict = { errors: string[]; warnings: string[] };

export const hasErrors = (rows: readonly ImportRowVerdict[]): boolean =>
  rows.some(row => row.errors.length > 0);

export const hasWarnings = (rows: readonly ImportRowVerdict[]): boolean =>
  rows.some(row => row.warnings.length > 0);

/** A file with any rejection imports nothing. */
export const canImport = (rows: readonly ImportRowVerdict[]): boolean =>
  rows.length > 0 && !hasErrors(rows);
