import { createSignal, type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import {
  SplitButton,
  type SplitButtonOption,
} from '@/ui/elements/buttons/SplitButton';
import { DownloadIcon } from '@/ui/icons';
import {
  csvToExcel,
  fetchReportFile,
  listExportCsvFilename,
  listExportExcelFilename,
} from '@/domain/reportFiles';
import { saveBlob } from '@/platform/openDocument';
import { storeCodeOf } from '@/auth/authContext';
import { stripEmpty } from '@/typeHelpers';
import { Stocktakes } from '../stocktakes.generated';
import type { StocktakesVariables } from '../stocktakes.generated';
import type { StocktakeFilter } from '../listFilters';
import { stocktakesToCsv } from '../stocktakesToCsv';

// The stocktakes list Export action (spec/stocktakes S1 "Export CSV"): a split
// button offering CSV or Excel, exporting EVERY stocktake matching the current
// filter (not just the page). CSV downloads directly; Excel round-trips the CSV
// through the server's csvToExcel converter, then downloads the workbook —
// reusing the cross-vertical generated-file path (domain/reportFiles). A
// self-contained action like the list's Delete (kdd/action-modal), owning its
// own fetch + busy state; failures fall through the global error modal (the
// fetch/convert helpers never throw).

export interface ExportStocktakesActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => StocktakeFilter;
}

export const ExportStocktakesAction: Component<
  ExportStocktakesActionProps
> = props => {
  const [busy, setBusy] = createSignal(false);

  // An accessor read in JSX, so the labels re-translate on a language switch.
  const options = (): SplitButtonOption[] => [
    { value: 'csv', label: t('button.export-csv') },
    { value: 'excel', label: t('button.export-excel') },
  ];

  // Fetch every matching stocktake (no page cap) and build the CSV. Returns
  // null when there's nothing to export.
  const buildCsv = async (): Promise<string | null> => {
    const variables: StocktakesVariables = {
      storeId: props.storeId,
      filter: stripEmpty(props.filter()),
      sort: [{ key: 'stocktakeNumber', desc: true }],
    };
    const result = await graphqlFetch(Stocktakes, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.stocktakes.nodes;
    return nodes.length ? stocktakesToCsv(nodes) : null;
  };

  const run = async (format: string): Promise<void> => {
    if (busy()) return;
    setBusy(true);
    try {
      const csv = await buildCsv();
      if (!csv) return; // nothing to export
      // Filenames per the shared list-export rule
      // (ui-standards/list-views § regions).
      const storeCode = storeCodeOf(props.storeId);
      const listName = t('filename.stocktakes');
      if (format === 'excel') {
        const generated = await csvToExcel({
          storeId: props.storeId,
          csvData: csv,
          filename: listExportExcelFilename(storeCode, listName),
          sheetName: storeCode,
        });
        if (generated.kind !== 'fileId') return; // error already surfaced
        const file = await fetchReportFile(generated.fileId);
        if (file.kind === 'success') void saveBlob(file.blob, file.filename);
      } else {
        void saveBlob(
          new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
          listExportCsvFilename(storeCode, listName, new Date())
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SplitButton
      icon={<DownloadIcon />}
      options={options()}
      testId="export-csv"
      menuLabel={t('button.export')}
      onAction={format => void run(format)}
    />
  );
};
