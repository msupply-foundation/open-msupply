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
