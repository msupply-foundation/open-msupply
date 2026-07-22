import { graphqlFetch } from '../../api/graphql';
import { CsvToExcel } from './reportFiles.generated';
import type {
  CsvToExcelResult,
  CsvToExcelVariables,
} from './reportFiles.generated';

// CSV-to-workbook conversion + the shared PrintReportResponse mapping, in the
// stocktakes mutation-wrapper style (plain module, graphqlFetch, discriminated
// result). Shared across verticals (spec/reports "Cross-cutting" / AC-F3):
// list-screen exports convert here, then fetch/download via files.ts. The
// reports vertical's generateReport returns the same response union and reuses
// mapPrintResponse. Every type is derived by indexing the generated Result
// types — no parallel interfaces (kdd/type-safety).

export type { CsvToExcelVariables };

// The outcome of a generate / convert call:
// - `fileId` — success; fetch the document from /files with this handle.
// - `dataError` — the only reachable typed error (FailedToFetchReportData),
//   carrying the failing data query's raw GraphQL errors (JSON) so the caller
//   can show why (spec/reports "Generation"). `errors` is opaque JSON.
// - `failed` — transport / unexpected error; the global error modal has already
//   shown it (or a non-typed server fault surfaced there), so the caller stays
//   silent — same convention as the stocktakes wrappers.
export type GenerateResult =
  | { kind: 'fileId'; fileId: string }
  | { kind: 'dataError'; errors: unknown }
  | { kind: 'failed' };

// PrintReportResponse as this module's operation selects it; the reports
// vertical's generateReport selects the identical shape, so its response is
// structurally assignable here.
type PrintResponse = CsvToExcelResult['csvToExcel'];

export const mapPrintResponse = (response: PrintResponse): GenerateResult => {
  if (response.__typename === 'PrintReportNode') {
    return { kind: 'fileId', fileId: response.fileId };
  }
  if (response.__typename === 'PrintReportError') {
    // FailedToFetchReportData is the only reachable member; its `errors` is the
    // raw JSON array of the failing query's GraphQL errors.
    return { kind: 'dataError', errors: response.error.errors };
  }
  return { kind: 'failed' };
};

// Convert CSV text to an Excel workbook (list-screen exports). A root query
// despite creating a server-side file (spec/reports/contract) — no
// cache-invalidation semantics; the caller fetches the returned handle.
export const csvToExcel = async (
  variables: CsvToExcelVariables
): Promise<GenerateResult> => {
  const result = await graphqlFetch(CsvToExcel, variables);
  if (result.kind !== 'success') return { kind: 'failed' };
  return mapPrintResponse(result.data.csvToExcel);
};
