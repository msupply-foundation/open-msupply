import { graphqlFetch, type GraphqlFailure } from '../../api/graphql';
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
// - `error` — an UNtyped generation fault: one of the plain GraphQL errors the
//   contract says most server-side faults arrive as (a broken definition, a
//   failed transform, the tablet's missing Chrome binary behind a PDF render).
//   `message` is the description. Both wrappers opt into handling their own
//   GraphQL errors (`returnGraphqlErrors`, the opt-in kdd/state-management
//   sanctions), so nothing global has shown it: the caller MUST show it at the
//   control the user clicked (spec/reports S5, AC-G6) — never the global modal,
//   whose Reload just re-runs the same failing generation.
// - `failed` — the call could not be made at all (a connection failure or an
//   unusable response), which stays an unexpected error on the app's global
//   surface by default; the caller stays silent — same convention as the
//   stocktakes wrappers.
export type GenerateResult =
  | { kind: 'fileId'; fileId: string }
  | { kind: 'dataError'; errors: unknown }
  | { kind: 'error'; message: string }
  | { kind: 'failed' }
  // - `aborted` — the caller cancelled it (a superseded regenerate, a screen
  //   left behind). Not a fault and not the user's business: callers drop it
  //   silently, showing neither an error nor a stale document.
  | { kind: 'aborted' };

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
  // An unrecognised union member: unreachable against the current schema, but
  // it is still a generation that produced no file, so it is reported like any
  // other fault rather than swallowed.
  return { kind: 'error', message: 'Unrecognised generation response' };
};

// A non-success from the query method, as a generation outcome. Both wrappers
// pass `returnGraphqlErrors`, so a server-side generation fault arrives as
// `graphqlError` with its description — that is the caller's to show. Anything
// else (a connection failure, an unusable response, an unauthenticated
// session) keeps the global surface the default path already gave it, and
// leaves the caller silent.
//
// Opting in takes Forbidden too, by design (spec/startup/rules § permission
// denied): a permission-denied generate then reads as an ordinary inline
// failure at the control rather than the global permission-denied modal.
// Near-unreachable in practice — listing and
// generating share one permission, so a user who can pick a form can generate
// it.
export const mapPrintFailure = (failure: GraphqlFailure): GenerateResult =>
  failure.kind === 'graphqlError'
    ? { kind: 'error', message: failure.message }
    : failure.kind === 'aborted'
      ? { kind: 'aborted' }
      : { kind: 'failed' };

// Convert CSV text to an Excel workbook (list-screen exports). A root query
// despite creating a server-side file (spec/reports/contract) — no
// cache-invalidation semantics; the caller fetches the returned handle.
export const csvToExcel = async (
  variables: CsvToExcelVariables
): Promise<GenerateResult> => {
  const result = await graphqlFetch(CsvToExcel, variables, {
    returnGraphqlErrors: true,
  });
  if (result.kind !== 'success') return mapPrintFailure(result);
  return mapPrintResponse(result.data.csvToExcel);
};
