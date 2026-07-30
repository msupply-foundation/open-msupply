import { t } from '../../../intl';
import { localisedDate } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
import { statusLabel } from './requisitionStatus';
import type { RequisitionRowFragment } from './requisitions.generated';

// The requisitions list → CSV (spec/requisitions › CSV export /
// OMS-REG-DIST-05.3). Columns are the list's exported fields: customer name,
// requisition number, created date-time, status, comment — plus Program, Order
// type, and Period when the program columns are gated on ([D17]; empty for
// non-program rows). Headers are translated; dates localised; status uses the
// same catalog labels as the list chip. Feeds either a direct .csv download or
// the server's csvToExcel conversion (domain/reportFiles). Mirrors
// internalOrdersToCsv.
export const requisitionsToCsv = (
  rows: RequisitionRowFragment[],
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
    localisedDate(row.createdDatetime),
    statusLabel(row.status),
    row.comment ?? '',
    ...(includeProgram
      ? [row.programName ?? '', row.orderType ?? '', row.period?.name ?? '']
      : []),
  ]);
  return toCsv(fields, data);
};
