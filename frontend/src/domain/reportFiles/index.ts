// The cross-vertical generated-file path (spec/reports "Cross-cutting" /
// AC-F3): convert (csvToExcel) or generate (the reports vertical's own
// generateReport) → fetch the handle (fetchReportFile) → deliver via the
// platform capabilities (src/platform/openDocument): openBlob / saveBlob to
// view or keep the file, printBlob to print it.
export { fetchReportFile } from './files';
export {
  csvToExcel,
  mapPrintResponse,
  type CsvToExcelVariables,
  type GenerateResult,
} from './csvToExcel';
export { toCsv } from './csv';
export {
  listExportCsvFilename,
  listExportExcelFilename,
  sanitizeForFilename,
} from './exportFilenames';
