// The cross-vertical generated-file path (spec/reports "Cross-cutting" /
// AC-F3): convert (csvToExcel) or generate (the reports vertical's own
// generateReport) → fetch the handle (fetchReportFile) → deliver via the
// platform capabilities (src/platform/openDocument): openBlob / saveBlob to
// view or keep the file, printBlob to print it.
export { fetchReportFile } from './files';
export {
  csvToExcel,
  mapPrintFailure,
  mapPrintResponse,
  type CsvToExcelVariables,
  type GenerateResult,
} from './csvToExcel';
export { toCsv, parseCsv, readCsvFile, sniffSeparator } from './csv';
export {
  listExportCsvFilename,
  listExportExcelFilename,
  sanitizeForFilename,
} from './exportFilenames';
// ListExportAction is deliberately NOT re-exported here. This barrel is
// imported by every vertical's pure `*ToCsv` formatter (for `toCsv`), and the
// component drags the whole SplitButton/Kobalte/Dialog graph behind it — which
// broke those formatters' unit tests outright, and would entangle the chunk
// graph app-wide (src/ui/CLAUDE.md principle 11). Import it by full path:
//   import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
