// The CSV bulk-import domain module (kdd/domain-modules, a concern-named
// folder): the file, heading, number and date readers every import shares.
export {
  CSV_ACCEPT,
  IMPORT_BATCH_SIZE,
  canImport,
  findHeaderRow,
  hasErrors,
  hasWarnings,
  isCsvFileName,
  parseImportDate,
  parseImportNumber,
  type ImportFileFailure,
  type ImportRowVerdict,
} from './csvImport';
