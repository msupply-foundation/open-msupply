import { legacyCodePage, locale } from '@/intl';

// Minimal CSV serialisation for list-screen exports (spec/reports
// "Cross-cutting" / OMS-REG-RPT-09.15). Dependency-free — the app carries no
// papaparse, and the shape we emit (a header row + string cells) needs only
// RFC-4180 quoting. The produced text feeds either a direct .csv download
// (downloadBlob) or the server's csvToExcel conversion.

// Quote a single cell per RFC 4180: wrap in double-quotes and double any inner
// quote when the value contains a quote, comma, or newline; otherwise leave it
// bare. null/undefined become empty.
const escapeCell = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /["\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Build CSV text from a header row and a matrix of rows. Rows are CRLF-joined
// (the RFC-4180 line terminator, and what Excel expects).
export const toCsv = (
  fields: string[],
  rows: Array<Array<string | number | null | undefined>>
): string =>
  [fields, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');

/*
 * Read an uploaded CSV as text, in whatever encoding it was saved in.
 *
 * `File.text()` always decodes UTF-8, and Excel on Windows does not save UTF-8
 * — it writes the machine's legacy code page. A file with one accented or
 * non-Latin character in a name or a note then arrives mojibaked, or throws,
 * and the user sees nothing that explains why.
 *
 * Decided by TRYING, not by guessing: a strict UTF-8 decode rejects byte
 * sequences that are not valid UTF-8, and legacy-encoded text almost always
 * contains some. Text that decodes cleanly as UTF-8 is treated as UTF-8 —
 * which is right, because ASCII and real UTF-8 both pass — and only text that
 * fails falls back to a legacy code page.
 *
 * WHICH code page cannot be sniffed: every one of them decodes any byte at
 * all, so the wrong one produces plausible-looking wrong text rather than an
 * error. It follows the language the user is working in instead — a Russian
 * user's spreadsheet wrote windows-1251, an Arabic user's windows-1256
 * (intl § legacyCodePage). A caller may name one explicitly.
 */
export const readCsvFile = async (
  file: Blob,
  fallbackEncoding: string = legacyCodePage(locale())
): Promise<string> => {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder(fallbackEncoding).decode(bytes);
  }
};

/*
 * Which character separates the fields, decided from the file's heading line.
 *
 * We write `,`, but a spreadsheet does not read the file back that way: Excel
 * uses the machine's list separator, which on a great many Windows locales is
 * `;`. A user who opens one of our templates, fills it in and saves it gets a
 * semicolon-delimited file that is still, to them, the file we gave them. Read
 * with a fixed comma it parses as ONE column per row, every header lookup
 * misses, and every row fails for a missing value it plainly has.
 *
 * Decided on ONE line — the first of the opening few that carries any of the
 * three separators a spreadsheet actually emits — and only between those
 * three. A quoted cell further down may contain any of them, but a heading is
 * a row of plain column names, so counting there is safe. Lines with none of
 * them are skipped rather than trusted: a title a user typed above the heading
 * is a single cell, and deciding on it would read the whole file as one
 * column. A tie, or a file with none of them anywhere, stays a comma.
 */
const SEPARATORS = [',', ';', '\t'] as const;

/** How many opening lines may sit above the heading and still be seen past. */
const SNIFF_LINES = 5;

export const sniffSeparator = (source: string): string => {
  const lines = source.split(/\r?\n/, SNIFF_LINES);
  for (const line of lines) {
    let best = ',';
    let bestCount = 0;
    for (const candidate of SEPARATORS) {
      const count = line.split(candidate).length - 1;
      if (count > bestCount) {
        best = candidate;
        bestCount = count;
      }
    }
    if (bestCount > 0) return best;
  }
  return ',';
};

/*
 * A minimal RFC-4180 reader — quoted fields (with embedded separators, newlines
 * and doubled quotes), CRLF or LF line endings, and a leading BOM. Own the
 * simple: the app already writes its CSVs by hand (domain/reportFiles § toCsv),
 * and a parser dependency would cost more bundle than these forty lines
 * (CLAUDE.md § keep the bundle small).
 *
 * The separator is sniffed per file unless the caller names one.
 */
export const parseCsv = (text: string, separator?: string): string[][] => {
  const source = text.replace(/^\uFEFF/, '');
  const sep = separator ?? sniffSeparator(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === sep) endField();
    else if (char === '\n') endRow();
    else if (char === '\r') {
      // Swallow the CR of a CRLF; a lone CR also ends the row.
      if (source[i + 1] !== '\n') endRow();
    } else field += char;
  }
  // A trailing newline leaves nothing pending; anything else is the last row.
  if (field !== '' || row.length > 0) endRow();
  // Drop rows that are entirely empty (a blank line in the file).
  return rows.filter(cells => cells.some(cell => cell.trim() !== ''));
};
