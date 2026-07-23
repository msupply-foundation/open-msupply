// The cross-vertical generated-file path (spec/reports "Cross-cutting" /
// AC-F3): convert (csvToExcel) or generate (the reports vertical's own
// generateReport) → fetch the handle (fetchReportFile) → download or print.
export { fetchReportFile, downloadBlob, printHtml } from './files';
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
