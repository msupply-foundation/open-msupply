import { graphqlFetch } from '../../api/graphql';
import { locale } from '../../intl';
import { currentStoreId } from '../../store/storeContext';
import {
  mapPrintFailure,
  mapPrintResponse,
  type GenerateResult,
} from '../reportFiles';
import { GenerateReport } from './reports.generated';
import type { GenerateReportVariables } from './reports.generated';

// Render one report against one record into a file (spec/reports "Generation").
// The reports vertical's own generate call — the counterpart to reportFiles'
// csvToExcel: same PrintReportResponse union, so it reuses mapPrintResponse and
// returns the shared GenerateResult (fileId | dataError | failed). The caller
// then fetches the handle (fetchReportFile) and prints/downloads (files.ts).

// The PrintFormat the caller asks for — the generated variables' own literal
// union ('PDF' | 'HTML' | 'EXCEL'), so a caller can't name a format the server
// doesn't support (kdd/type-safety).
export type PrintFormat = NonNullable<GenerateReportVariables['format']>;

// The detail table's current sort, passed through so the document orders its
// rows the same way the user sees them (spec/stocktakes S3 "respecting the
// current sort"). key is the server sort-field name; desc the direction.
export interface ReportSort {
  key: string;
  desc: boolean;
}

export interface GenerateReportParams {
  reportId: string;
  /**
   * The record the report renders (e.g. the stocktake id). Absent for the
   * Reports dashboard's standalone reports (spec/reports S2), which render
   * against the store, not a record.
   */
  dataId?: string;
  format: PrintFormat;
  /** Optional filter-form arguments (from the ArgumentsModal). */
  args?: Record<string, unknown>;
  /** Optional row sort, from the host screen's table. */
  sort?: ReportSort;
  /**
   * Cancels this generation, resolving it to `{ kind: 'aborted' }`. Generation
   * is the app's longest single request, so a caller that can supersede one (the
   * dashboard re-generating on an argument change) or walk away from one
   * (navigating off the screen) should pass a signal rather than leave it in
   * flight holding a connection and a pending resource.
   */
  signal?: AbortSignal;
}

export const generateReport = async (
  params: GenerateReportParams
): Promise<GenerateResult> => {
  const variables: GenerateReportVariables = {
    storeId: currentStoreId() ?? '',
    reportId: params.reportId,
    dataId: params.dataId,
    format: params.format,
    arguments: params.args,
    sort: params.sort,
    currentLanguage: locale(),
  };
  // `returnGraphqlErrors`: generation handles its own GraphQL errors — the
  // opt-in kdd/state-management sanctions, the same one the store editor and
  // the settings modals take. It earns it here because most server-side
  // generation failures arrive as plain GraphQL errors rather than the typed
  // member (spec/reports/contract § Generation): a broken definition, a failed
  // transform, or a PDF render on a device whose server has no Chrome binary.
  // On the default path those trip the global modal, which offers Reload (it
  // re-runs the same failing generation) and Go to dashboard (it discards the
  // user's place) for a screen that is perfectly healthy; the caller shows the
  // message inline at the export control instead (spec/reports S5, AC-G6).
  const result = await graphqlFetch(GenerateReport, variables, {
    returnGraphqlErrors: true,
    signal: params.signal,
  });
  if (result.kind !== 'success') return mapPrintFailure(result);
  return mapPrintResponse(result.data.generateReport);
};
