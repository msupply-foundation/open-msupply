import { t } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
import { statusLabel } from '../outboundStatus';
import type { OutboundShipmentsResult } from './outboundShipments.generated';

type ShipmentRow = OutboundShipmentsResult['invoices']['nodes'][number];

// The outbound-shipments list → CSV (spec/outbound-shipments S1 Export, OMS-REG-DIST-01.18).
// Columns match the list's visible fields; status uses the same catalog labels
// as the list's chip. Feeds either a direct .csv download or the server's
// csvToExcel conversion (domain/reportFiles) — mirroring the reference
// stocktakesToCsv.
export const shipmentsToCsv = (rows: ShipmentRow[]): string => {
  const fields = [
    t('label.name'),
    t('label.status'),
    t('label.number'),
    t('label.created'),
    t('label.reference'),
    t('label.comment'),
    t('label.total'),
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
