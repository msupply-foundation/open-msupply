import { exportDate, t } from '@/intl';
import { toCsv } from '@/domain/reportFiles';
import { poStatusLabel } from '../purchaseOrderStatus';
import type { PurchaseOrderRowFragment } from './purchaseOrders.generated';

// The purchase-orders list → CSV (OMS-FUN-PO-10.1/.2, OMS-FUN-PO-15.14): every
// field the list reports for an order, in the order the list shows them
// (rules § listing orders) — so the twelve S1 columns, headers translated,
// dates localised for the reader but Latin-digited for the spreadsheet
// (exportDate), and the status through the shared label rather than its
// misleading stored name.
//
// It carries Total cost and Currency, which the reference app's own export
// drops (contract § listing orders names both as fields the export reads).
export const purchaseOrdersToCsv = (
  rows: PurchaseOrderRowFragment[]
): string => {
  const fields = [
    t('label.supplier'),
    t('label.number'),
    t('label.created'),
    t('label.confirmed'),
    t('label.sent'),
    t('label.requested-delivery-date'),
    t('label.status'),
    t('label.target-months'),
    t('label.total-cost'),
    t('label.currency'),
    t('label.lines'),
    t('label.comment'),
  ];
  const data = rows.map(row => [
    row.supplier?.name ?? '',
    row.number,
    exportDate(row.createdDatetime),
    row.confirmedDatetime ? exportDate(row.confirmedDatetime) : '',
    row.sentDatetime ? exportDate(row.sentDatetime) : '',
    row.requestedDeliveryDate ? exportDate(row.requestedDeliveryDate) : '',
    poStatusLabel(row.status),
    row.targetMonths ?? '',
    // No lines, no total (rules § pricing and totals): blank, as every other
    // absent value here is, never the server's fabricated 0.
    row.lines.totalCount === 0 ? '' : row.orderTotalAfterDiscount,
    row.currency?.code ?? '',
    row.lines.totalCount,
    row.comment ?? '',
  ]);
  return toCsv(fields, data);
};
