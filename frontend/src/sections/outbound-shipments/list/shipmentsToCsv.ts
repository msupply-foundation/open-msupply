import { t } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
import { statusLabel } from '../outboundStatus';
import type { OutboundShipmentsResult } from './outboundShipments.generated';

type ShipmentRow = OutboundShipmentsResult['invoices']['nodes'][number];

// The outbound-shipments list → CSV (spec/outbound-shipments S1 Export, AC-L4).
// Columns match the list's visible fields; status uses the same catalog labels
// as the list's chip. Feeds either a direct .csv download or the server's
// csvToExcel conversion (domain/reportFiles) — mirroring the reference
// stocktakesToCsv.
export const shipmentsToCsv = (rows: ShipmentRow[]): string => {
  const fields = [
    t('outbound.column.customer'),
    t('outbound.column.status'),
    t('outbound.column.number'),
    t('outbound.column.created'),
    t('outbound.column.reference'),
    t('outbound.column.comment'),
    t('outbound.column.total'),
  ];
  const data = rows.map(row => [
    row.otherPartyName,
    statusLabel(row.status),
    row.invoiceNumber,
    row.createdDatetime,
    row.theirReference,
    row.comment,
    row.pricing.totalAfterTax,
  ]);
  return toCsv(fields, data);
};
