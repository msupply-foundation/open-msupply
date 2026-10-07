import { exportDate, t } from '@/intl';
import { toCsv } from '@/domain/reportFiles';
import type { OutstandingLineRowFragment } from './outstandingLines.generated';

// The outstanding-lines list → CSV (OMS-FUN-PO-14.11): every field the list
// reports for a line, in the order the list shows them (rules § listing
// outstanding lines) — so the eleven S5 columns, headers translated, dates
// localised for the reader but Latin-digited for the spreadsheet (exportDate).
export const outstandingLinesToCsv = (
  rows: OutstandingLineRowFragment[]
): string => {
  const fields = [
    t('label.purchase-order-number'),
    t('label.purchase-order-reference'),
    t('label.created-by'),
    t('label.supplier-code'),
    t('label.supplier-name'),
    t('label.item-name'),
    t('label.purchase-order-confirmed'),
    t('label.expected-delivery-date'),
    t('label.adjusted-units-expected'),
    t('label.total-received'),
    t('label.outstanding-units'),
  ];
  const data = rows.map(row => [
    row.purchaseOrder?.number ?? '',
    row.purchaseOrder?.reference ?? '',
    row.purchaseOrder?.user?.username ?? '',
    row.purchaseOrder?.supplier?.code ?? '',
    row.purchaseOrder?.supplier?.name ?? '',
    row.item.name,
    row.purchaseOrder?.confirmedDatetime
      ? exportDate(row.purchaseOrder.confirmedDatetime)
      : '',
    row.expectedDeliveryDate ? exportDate(row.expectedDeliveryDate) : '',
    row.adjustedNumberOfUnits ?? '',
    row.receivedNumberOfUnits,
    row.outstandingNumberOfUnits,
  ]);
  return toCsv(fields, data);
};
