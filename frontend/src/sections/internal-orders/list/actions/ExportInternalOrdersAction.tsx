import { createSignal, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import {
  SplitButton,
  type SplitButtonOption,
} from '../../../../ui/elements/buttons/SplitButton';
import { DownloadIcon } from '../../../../ui/icons';
import {
  csvToExcel,
  fetchReportFile,
  listExportCsvFilename,
  listExportExcelFilename,
} from '../../../../domain/reportFiles';
import { saveBlob } from '../../../../platform/openDocument';
import { storeCodeOf } from '../../../../auth/authContext';
import { stripEmpty } from '../../../../typeHelpers';
import { InternalOrders } from '../internalOrders.generated';
import type { InternalOrdersVariables } from '../internalOrders.generated';
import type { InternalOrderFilter } from '../listFilters';
import { internalOrdersToCsv } from '../internalOrdersToCsv';

// The internal-orders list Export action (spec S1 / AC-X1): a split button
// offering CSV or Excel, exporting EVERY order matching the current filter (not
// just the page), newest first ([D12]). CSV downloads directly; Excel
// round-trips the CSV through the server's csvToExcel converter. Mirrors
// ExportStocktakesAction / ExportInboundShipmentsAction — self-contained, owns
// its own fetch + busy state; failures fall through the global error modal.
export interface ExportInternalOrdersActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => InternalOrderFilter;
  /** Whether the program columns are gated on — adds them to the CSV [D17]. */
  includeProgram: () => boolean;
}

export const ExportInternalOrdersAction: Component<
  ExportInternalOrdersActionProps
> = props => {
  const [busy, setBusy] = createSignal(false);

  // An accessor read in JSX, so the labels re-translate on a language switch.
  const options = (): SplitButtonOption[] => [
    { value: 'csv', label: t('button.export-csv') },
    { value: 'excel', label: t('button.export-excel') },
  ];

  // Fetch every matching order (no page cap) and build the CSV. `type` is
  // pinned to REQUEST exactly as the list read (contract › "Internal orders
  // only"). Returns null when there's nothing to export.
  const buildCsv = async (): Promise<string | null> => {
    const variables: InternalOrdersVariables = {
      storeId: props.storeId,
      filter: { ...stripEmpty(props.filter()), type: { equalTo: 'REQUEST' } },
      sort: [{ key: 'createdDatetime', desc: true }],
    };
    const result = await graphqlFetch(InternalOrders, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.requisitions.nodes;
    return nodes.length
      ? internalOrdersToCsv(nodes, props.includeProgram())
      : null;
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
      const listName = t('filename.requests');
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
