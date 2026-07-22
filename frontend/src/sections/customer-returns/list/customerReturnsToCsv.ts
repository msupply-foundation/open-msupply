import { t } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
import { statusLabel } from '../detail/returnStatus';
import type { CustomerReturnsResult } from './customerReturns.generated';

type ReturnRow = Extract<
  CustomerReturnsResult['invoices'],
  { __typename: 'InvoiceConnector' }
>['nodes'][number];

// The customer-returns list → CSV (spec/customer-returns S1 Export, AC-L4).
// Columns match the list's visible fields; status uses the same catalog labels
// as the list's chip. Feeds either a direct .csv download or the server's
// csvToExcel conversion (domain/reportFiles) — mirroring the reference
// shipmentsToCsv. (The list nodes carry no pricing, so there is no total
// column — unlike outbound shipments.)
export const customerReturnsToCsv = (rows: ReturnRow[]): string => {
  const fields = [
    t('label.name'),
    t('label.status'),
    t('label.number'),
    t('label.created'),
    t('label.reference'),
    t('label.comment'),
  ];
  const data = rows.map(row => [
    row.otherPartyName,
    statusLabel(row.status),
    row.invoiceNumber,
    row.createdDatetime,
    row.theirReference,
    row.comment,
  ]);
  return toCsv(fields, data);
};
