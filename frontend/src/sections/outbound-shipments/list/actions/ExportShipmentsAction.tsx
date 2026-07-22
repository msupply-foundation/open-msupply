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
import {
  OutboundShipments,
  type OutboundShipmentsVariables,
} from '../outboundShipments.generated';
import { shipmentsToCsv } from '../shipmentsToCsv';

// The outbound-shipments list Export action (spec/outbound-shipments S1): a
// split button offering CSV or Excel, exporting EVERY shipment matching the
// current filter (all pages, newest first). CSV downloads directly; Excel
// round-trips the CSV through the server's csvToExcel converter, then downloads
// the workbook — reusing the cross-vertical generated-file path
// (domain/reportFiles). A self-contained action (kdd/action-modal) owning its
// own fetch + busy state, mirroring the reference ExportStocktakesAction;
// failures fall through the global error modal (the helpers never throw).

export interface ExportShipmentsActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => OutboundShipmentsVariables['filter'];
}

// The invoices resolver defaults to a bounded page when `page` is omitted, so
// the export passes an explicit page large enough to cover any realistic
// store's filtered set (ui-standards/list-views.md § regions, D12: export
// covers every row matching the active filters, across all pages). If a
// store somehow exceeds the cap the export is still (very largely)
// truncated, so that's logged rather than silently shipped.
const EXPORT_PAGE_SIZE = 10000;

export const ExportShipmentsAction: Component<
  ExportShipmentsActionProps
> = props => {
  const [busy, setBusy] = createSignal(false);

  const options: SplitButtonOption[] = [
    { value: 'csv', label: t('button.export-csv') },
    { value: 'excel', label: t('button.export-excel') },
  ];

  // Fetch every matching shipment (bounded by EXPORT_PAGE_SIZE above), newest
  // first, and build the CSV. Returns null when there's nothing to export.
  const buildCsv = async (): Promise<string | null> => {
    const result = await graphqlFetch(OutboundShipments, {
      storeId: props.storeId,
      filter: props.filter(),
      sort: [{ key: 'createdDatetime', desc: true }],
      page: { first: EXPORT_PAGE_SIZE },
    });
    if (result.kind !== 'success') return null;
    const { nodes, totalCount } = result.data.invoices;
    if (totalCount > nodes.length) {
      console.warn(
        `outbound-shipments export: truncated to ${nodes.length} of ${totalCount} matching rows (cap ${EXPORT_PAGE_SIZE}).`
      );
    }
    return nodes.length ? shipmentsToCsv(nodes) : null;
  };

  const run = async (format: string): Promise<void> => {
    if (busy()) return;
    setBusy(true);
    try {
      const csv = await buildCsv();
      if (!csv) return; // nothing to export
      const filename = t('filename.outbounds');
      if (format === 'excel') {
        const generated = await csvToExcel({
          storeId: props.storeId,
          csvData: csv,
          filename,
        });
        if (generated.kind !== 'fileId') return; // error already surfaced
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
