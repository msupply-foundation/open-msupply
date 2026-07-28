// Pure logic for the master-lists list-index export (spec/master-lists § export,
// OMS-REG-CAT-07.26/.29). Export is ENTIRELY client-side over the already-loaded
// page — the file therefore covers the current page only (.26). Colocated and
// pure so the column set, CSV escaping, and filename shape are unit-tested
// without a screen.

export type MasterListExportRow = {
  id: string;
  code: string;
  name: string;
  description: string;
};

// CSV field escaping: quote and double interior quotes when the value carries a
// comma, quote, or newline.
export const csvEscape = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

// The loaded rows → CSV. Columns: `id` (a LITERAL untranslated header,
// spec/master-lists ui-surface), then the translated Code / Name / Description
// headers supplied by the caller. Empty rows → header line only (the screen
// shows "No data available" instead of downloading — .29).
export const masterListsToCsv = (
  rows: MasterListExportRow[],
  headers: { code: string; name: string; description: string }
): string => {
  const head = ['id', headers.code, headers.name, headers.description]
    .map(csvEscape)
    .join(',');
  const body = rows
    .map(r => [r.id, r.code, r.name, r.description].map(csvEscape).join(','))
    .join('\n');
  return rows.length > 0 ? `${head}\n${body}` : head;
};
