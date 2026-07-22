import { t, localisedDate } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
import { statusLabel } from '../detail/inboundShipmentStatus';
import type { InboundRowFragment } from './inboundShipments.generated';

// The inbound-shipments list → CSV (spec S1 / AC-L6). Columns match the list's
// visible fields; headers translated, dates localised, status via the shared
// label. Feeds a direct .csv download or the server's csvToExcel conversion.
export const inboundShipmentsToCsv = (rows: InboundRowFragment[]): string => {
  const fields = [
    t('label.invoice-number'),
    t('label.status'),
    t('label.name'),
    t('label.reference'),
    t('label.created'),
    t('label.delivered'),
    t('label.comment'),
    t('label.total'),
  ];
  const data = rows.map(row => [
    row.invoiceNumber,
    statusLabel(row.status),
    row.otherPartyName,
    row.theirReference ?? '',
    localisedDate(row.createdDatetime),
    row.deliveredDatetime ? localisedDate(row.deliveredDatetime) : '',
    row.comment ?? '',
    row.pricing.totalAfterTax,
  ]);
  return toCsv(fields, data);
};
