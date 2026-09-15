import { t } from '../../../intl';
import { exportDate } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
import { statusLabel } from './internalOrderStatus';
import type { InternalOrderRowFragment } from './internalOrders.generated';

// The internal-orders list → CSV (spec/internal-orders S1 / AC-X1). Columns
// are the list's exported fields: supplier name, order number, created
// date-time, status, comment — plus Program, Order type, and Period when the
// program columns are gated on ([D17]). Headers are translated; dates
// localised; status uses the same catalog labels as the list chip. Feeds either
// a direct .csv download or the server's csvToExcel conversion
// (domain/reportFiles). Mirrors stocktakesToCsv.
export const internalOrdersToCsv = (
  rows: InternalOrderRowFragment[],
  includeProgram: boolean
): string => {
  const fields = [
    t('label.name'),
    t('label.number'),
    t('label.created'),
    t('label.status'),
    t('label.comment'),
    ...(includeProgram
      ? [t('label.program'), t('label.order-type'), t('label.period')]
      : []),
  ];
  const data = rows.map(row => [
    row.otherPartyName,
    row.requisitionNumber,
    exportDate(row.createdDatetime),
    statusLabel(row.status),
    row.comment ?? '',
    ...(includeProgram
      ? [row.program?.name ?? '', row.orderType ?? '', row.period?.name ?? '']
      : []),
  ]);
  return toCsv(fields, data);
};
