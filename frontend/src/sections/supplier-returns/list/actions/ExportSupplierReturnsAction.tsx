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
import {
  SupplierReturns,
  type SupplierReturnsVariables,
} from '../supplierReturns.generated';
import { supplierReturnsToCsv } from '../supplierReturnsToCsv';

// The supplier-returns list Export action (spec/supplier-returns S1): a split
// button offering CSV or Excel, exporting EVERY return matching the current
// filter (all pages, newest first). CSV downloads directly; Excel round-trips
// the CSV through the server's csvToExcel converter, then downloads the
// workbook — reusing the cross-vertical generated-file path
// (domain/reportFiles). A self-contained action (kdd/action-modal) owning its
// own fetch + busy state, mirroring the reference ExportShipmentsAction;
// failures fall through the global error modal (the helpers never throw).

export interface ExportSupplierReturnsActionProps {
  storeId: string;
  /** The list's current filter (type-pinned to SUPPLIER_RETURN) — the export
   *  matches it across all pages. */
  filter: () => SupplierReturnsVariables['filter'];
}

// The invoices resolver defaults to a bounded page when `page` is omitted, so
// the export passes an explicit page large enough to cover any realistic
// store's filtered set (ui-standards/list-views.md § regions: export covers
// every row matching the active filters, across all pages). If a store somehow
// exceeds the cap the export is truncated, so that's logged rather than
// silently shipped.
const EXPORT_PAGE_SIZE = 10000;

export const ExportSupplierReturnsAction: Component<
  ExportSupplierReturnsActionProps
> = props => {
  const [busy, setBusy] = createSignal(false);

  const options: SplitButtonOption[] = [
    { value: 'csv', label: t('button.export-csv') },
    { value: 'excel', label: t('button.export-excel') },
  ];

  // Fetch every matching return (bounded by EXPORT_PAGE_SIZE above), newest
  // first, and build the CSV. Returns null when there's nothing to export.
  const buildCsv = async (): Promise<string | null> => {
    const result = await graphqlFetch(SupplierReturns, {
      storeId: props.storeId,
      filter: props.filter(),
      sort: [{ key: 'createdDatetime', desc: true }],
      page: { first: EXPORT_PAGE_SIZE },
    });
    if (result.kind !== 'success') return null;
    if (result.data.invoices.__typename !== 'InvoiceConnector') return null;
    const { nodes, totalCount } = result.data.invoices;
    if (totalCount > nodes.length) {
      console.warn(
        `supplier-returns export: truncated to ${nodes.length} of ${totalCount} matching rows (cap ${EXPORT_PAGE_SIZE}).`
      );
    }
    return nodes.length ? supplierReturnsToCsv(nodes) : null;
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
      const listName = t('filename.supplier-returns');
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
      options={options}
      testId="export-csv"
      menuLabel={t('button.export')}
      onAction={format => void run(format)}
    />
  );
};
