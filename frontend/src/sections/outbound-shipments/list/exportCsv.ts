import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { statusLabel } from '../outboundStatus';
import {
  OutboundShipments,
  type OutboundShipmentsVariables,
} from './outboundShipments.generated';

// CSV export (spec S1 page actions, AC-L4): every shipment matching the ACTIVE
// filters, across all pages (the list-view standard) — the same query with no
// pagination argument; serialisation is client-side.

const escapeCell = (value: string | number | null | undefined): string => {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const exportShipmentsCsv = async (
  storeId: string,
  filter: OutboundShipmentsVariables['filter'],
  sort: OutboundShipmentsVariables['sort']
): Promise<boolean> => {
  const result = await graphqlFetch(OutboundShipments, {
    storeId,
    filter,
    sort,
  });
  if (result.kind !== 'success') return false;
  const rows = result.data.invoices.nodes;

  const header = [
    t('outbound.column.customer'),
    t('outbound.column.status'),
    t('outbound.column.number'),
    t('outbound.column.created'),
    t('outbound.column.reference'),
    t('outbound.column.comment'),
    t('outbound.column.total'),
  ];
  const lines = rows.map(row =>
    [
      row.otherPartyName,
      statusLabel(row.status),
      row.invoiceNumber,
      row.createdDatetime,
      row.theirReference,
      row.comment,
      row.pricing.totalAfterTax,
    ]
      .map(escapeCell)
      .join(',')
  );
  const csv = [header.map(escapeCell).join(','), ...lines].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'outbound-shipments.csv';
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
};
