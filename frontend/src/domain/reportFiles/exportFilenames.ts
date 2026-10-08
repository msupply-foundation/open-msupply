// Shared list-export filenames (spec/ui-standards/list-views.md § regions):
// `<instant>_<store code>_<list name>.csv`, e.g.
// 2026-07-23T02:40:21.429Z_GHOG_locations.csv. The timestamp is the raw ISO
// instant — browsers may substitute its reserved `:` at save time, which is
// deliberately left to them. Callers pass the vertical's list name (its
// `filename.*` catalog entry).

// Neutralise characters that can't appear in a path or download attribute.
export const sanitizeForFilename = (value: string): string =>
  // eslint-disable-next-line no-control-regex
  value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');

// The CSV download name: `<instant>_<store code>_<list name>.csv`.
export const listExportCsvFilename = (
  storeCode: string,
  listName: string,
  now: Date
): string =>
  `${now.toISOString()}_${sanitizeForFilename(storeCode)}_${listName}.csv`;

// The workbook filename passed to the csvToExcel conversion:
// `<store code>_<list name>` — store code raw; the file service builds the
// final served name itself (spec/reports/contract).
export const listExportExcelFilename = (
  storeCode: string,
  listName: string
): string => `${storeCode}_${listName}`;
