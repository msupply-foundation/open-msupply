// Minimal CSV serialisation for list-screen exports (spec/reports
// "Cross-cutting" / AC-F3). Dependency-free — the app carries no papaparse, and
// the shape we emit (a header row + string cells) needs only RFC-4180 quoting.
// The produced text feeds either a direct .csv download (downloadBlob) or the
// server's csvToExcel conversion.

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
 * A minimal RFC-4180 reader — quoted fields (with embedded commas, newlines and
 * doubled quotes), CRLF or LF line endings, and a leading BOM. Own the simple:
 * the app already writes its CSVs by hand (domain/reportFiles § toCsv), and a
 * parser dependency would cost more bundle than these thirty lines
 * (CLAUDE.md § keep the bundle small).
 */
export const parseCsv = (text: string): string[][] => {
  const source = text.replace(/^\uFEFF/, '');
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
    else if (char === ',') endField();
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
