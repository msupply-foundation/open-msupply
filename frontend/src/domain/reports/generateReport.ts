import { graphqlFetch } from '../../api/graphql';
import { locale } from '../../intl';
import { currentStoreId } from '../../store/storeContext';
import { mapPrintResponse, type GenerateResult } from '../reportFiles';
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
  /** The record the report renders (e.g. the stocktake id). */
  dataId: string;
  format: PrintFormat;
  /** Optional filter-form arguments (from the ArgumentsModal). */
  args?: Record<string, unknown>;
  /** Optional row sort, from the host screen's table. */
  sort?: ReportSort;
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
  const result = await graphqlFetch(GenerateReport, variables);
  if (result.kind !== 'success') return { kind: 'failed' };
  return mapPrintResponse(result.data.generateReport);
};
