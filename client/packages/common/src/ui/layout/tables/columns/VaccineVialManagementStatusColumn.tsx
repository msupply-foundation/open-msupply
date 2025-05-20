import { TypedTFunction, LocaleKey } from '@common/intl';
import { RecordWithId } from '@common/types';
import { UNDEFINED_STRING_VALUE } from '@common/utils';
import { ColumnDefinition, ColumnAlign } from './types';
import { StockOutLineFragment } from 'packages/invoices/src/StockOut';

export const getVaccineVialManagementStatusColumn = <
  T extends RecordWithId &
    (StockOutLineFragment | { lines: StockOutLineFragment[] }),
>(
  t: TypedTFunction<LocaleKey>
): ColumnDefinition<T> => ({
  label: 'label.vvm-status',
  key: 'vvmStatus',
  width: 100,
  sortable: false,
  align: ColumnAlign.Right,
  accessor: ({ rowData }) => {
    if ('lines' in rowData) {
      const { lines } = rowData;
      if (Array.isArray(lines) && !!lines[0]?.item?.isVaccine) {
        const statuses = lines.map(
          l => l.stockLine?.vvmStatus?.description ?? UNDEFINED_STRING_VALUE
        );
        const sameStatuses = statuses.every(status => status === statuses[0]);
        // return undefined if all the same and all undefined
        return sameStatuses ? statuses[0] : t('multiple');
      } else {
        return UNDEFINED_STRING_VALUE;
      }
    } else {
      return (
        rowData?.stockLine?.vvmStatus?.description ?? UNDEFINED_STRING_VALUE
      );
    }
  },
});
