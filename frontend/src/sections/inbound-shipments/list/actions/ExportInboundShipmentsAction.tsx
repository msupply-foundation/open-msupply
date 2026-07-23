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
  listExportCsvFilename,
  listExportExcelFilename,
} from '../../../../domain/reportFiles';
import { storeCodeOf } from '../../../../auth/authContext';
import { InboundShipments } from '../inboundShipments.generated';
import type { InboundShipmentsVariables } from '../inboundShipments.generated';
import { inboundQueryInputs, type InboundListFilter } from '../listFilters';
import { inboundShipmentsToCsv } from '../inboundShipmentsToCsv';
import { heldInboundQueryScopes } from '../../inboundShipmentScope';

// The inbound-shipments list Export action (spec S1 / AC-L6): a split button
// offering CSV or Excel, exporting EVERY shipment matching the current filter
// (not just the page). CSV downloads directly; Excel round-trips the CSV
// through the server's csvToExcel converter. Mirrors ExportStocktakesAction —
// self-contained, owns its own fetch + busy state; failures fall through the
// global error modal.
export interface ExportInboundShipmentsActionProps {
  storeId: string;
  filter: () => InboundListFilter;
}

export const ExportInboundShipmentsAction: Component<
  ExportInboundShipmentsActionProps
> = props => {
  const [busy, setBusy] = createSignal(false);

  const options: SplitButtonOption[] = [
    { value: 'csv', label: t('button.export-csv') },
    { value: 'excel', label: t('button.export-excel') },
  ];

  const buildCsv = async (): Promise<string | null> => {
    // Same inputs as the list (spec/inbound-shipments › contract →
    // permissions): the Type filter's scope + requisitionId consequences and
    // the held query scopes, so the export spans exactly the inbound shipments
    // the current filter shows — never a scopeless (generic-permission) request
    // that would pull in other invoice types.
    const { filter, type } = inboundQueryInputs(
      props.filter(),
      heldInboundQueryScopes()
    );
    if (type.length === 0) return null;
    const variables: InboundShipmentsVariables = {
      storeId: props.storeId,
      filter,
      sort: [{ key: 'invoiceNumber', desc: true }],
      type,
    };
    const result = await graphqlFetch(InboundShipments, variables);
    if (result.kind !== 'success') return null;
    if (result.data.invoices.__typename !== 'InvoiceConnector') return null;
    const nodes = result.data.invoices.nodes;
    return nodes.length ? inboundShipmentsToCsv(nodes) : null;
  };

  const run = async (format: string): Promise<void> => {
    if (busy()) return;
    setBusy(true);
    try {
      const csv = await buildCsv();
      if (!csv) return;
      // Filenames per the shared list-export rule
      // (ui-standards/list-views § regions).
      const storeCode = storeCodeOf(props.storeId);
      const listName = t('filename.inbounds');
      if (format === 'excel') {
        const generated = await csvToExcel({
          storeId: props.storeId,
          csvData: csv,
          filename: listExportExcelFilename(storeCode, listName),
          sheetName: storeCode,
        });
        if (generated.kind !== 'fileId') return;
        const file = await fetchReportFile(generated.fileId);
        if (file.kind === 'success') downloadBlob(file.blob, file.filename);
      } else {
        downloadBlob(
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
