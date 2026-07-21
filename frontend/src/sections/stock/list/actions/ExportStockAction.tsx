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
  downloadBlob,
  fetchReportFile,
} from '../../../../domain/reportFiles';
import { stripEmpty } from '../../../../typeHelpers';
import { StockLines, type StockLinesVariables } from '../stock.generated';
import type { StockFilter } from '../listFilters';
import { stockToCsv } from '../stockToCsv';

// The stock list Export action (spec/stock AC-L6): a split button offering CSV
// or Excel, exporting EVERY stock line matching the current filter (all pages,
// packs-on-hand only) — not just the visible page. CSV downloads directly;
// Excel round-trips the CSV through the server's converter then downloads the
// workbook (domain/reportFiles). Self-contained, owning its own fetch + busy
// state; failures fall through the global error modal. Exports the flat line
// list regardless of the grouped toggle (the underlying rows).

export interface ExportStockActionProps {
  storeId: string;
  filter: () => StockFilter;
  sort: () => NonNullable<StockLinesVariables['sort']>;
}

const EXPORT_PAGE = 10000;

export const ExportStockAction: Component<ExportStockActionProps> = props => {
  const [busy, setBusy] = createSignal(false);

  const options: SplitButtonOption[] = [
    { value: 'csv', label: t('button.export-csv') },
    { value: 'excel', label: t('button.export-excel') },
  ];

  const buildCsv = async (): Promise<string | null> => {
    const variables: StockLinesVariables = {
      storeId: props.storeId,
      filter: { ...stripEmpty(props.filter()), hasPacksInStore: true },
      sort: props.sort(),
      page: { first: EXPORT_PAGE, offset: 0 },
    };
    const result = await graphqlFetch(StockLines, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.stockLines.nodes;
    return nodes.length ? stockToCsv(nodes) : null;
  };

  const run = async (format: string): Promise<void> => {
    if (busy()) return;
    setBusy(true);
    try {
      const csv = await buildCsv();
      if (!csv) return;
      const filename = t('filename.stock');
      if (format === 'excel') {
        const generated = await csvToExcel({
          storeId: props.storeId,
          csvData: csv,
          filename,
        });
        if (generated.kind !== 'fileId') return;
        const file = await fetchReportFile(generated.fileId);
        if (file.kind === 'success') downloadBlob(file.blob, file.filename);
      } else {
        downloadBlob(
          new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
          `${filename}.csv`
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SplitButton
      icon={<DownloadIcon />}
      options={options}
      testId="export-csv"
      menuLabel={t('button.export')}
      onAction={format => void run(format)}
    />
  );
};
