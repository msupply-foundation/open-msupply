import { graphqlFetch } from '../../../api/graphql';
import {
  GenerateReport,
  CsvToExcel,
  type ReportsResult,
  type GenerateReportResult,
  type GenerateReportVariables,
  type CsvToExcelResult,
  type CsvToExcelVariables,
} from './reports.generated';

// Report generation + CSV-to-workbook wrappers, in the stocktakes
// mutation-wrapper style (plain module, graphqlFetch, discriminated result).
// Both `generateReport` and `csvToExcel` return the same PrintReportResponse
// union, so they share one result shape and one mapper. Every type here is
// derived by indexing the generated Result types — no parallel interfaces
// (kdd/type-safety); the fileId returned is fetched from GET /files via
// files.ts (spec/reports "The generated file").

// The report the list/selector consumes — one connector node, derived straight
// from the generated ReportsResult so it stays in lockstep with the query's
// selection set (kdd/type-safety).
export type Report = Extract<
  ReportsResult['reports'],
  { __typename: 'ReportConnector' }
>['nodes'][number];

// The generateReport variables, re-exported for callers assembling a request.
export type { GenerateReportVariables, CsvToExcelVariables };

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

// PrintReportResponse is identical for both operations; extract the union once.
type PrintResponse =
  GenerateReportResult['generateReport'] | CsvToExcelResult['csvToExcel'];

const mapPrintResponse = (response: PrintResponse): GenerateResult => {
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

// Generate a report file. A root query despite creating a file (spec/reports):
// no cache-invalidation semantics — the caller fetches the returned handle.
export const generateReport = async (
  variables: GenerateReportVariables
): Promise<GenerateResult> => {
  const result = await graphqlFetch(GenerateReport, variables);
  if (result.kind !== 'success') return { kind: 'failed' };
  return mapPrintResponse(result.data.generateReport);
};

// Convert CSV text to an Excel workbook (list-screen exports). Same response
// shape and mapping as generateReport.
export const csvToExcel = async (
  variables: CsvToExcelVariables
): Promise<GenerateResult> => {
  const result = await graphqlFetch(CsvToExcel, variables);
  if (result.kind !== 'success') return { kind: 'failed' };
  return mapPrintResponse(result.data.csvToExcel);
};
