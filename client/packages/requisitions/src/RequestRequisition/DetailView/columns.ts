import { RequestLineFragment } from '../api/operations.generated';
import {
  useTranslation,
  ColumnAlign,
  useColumns,
  Column,
  SortBy,
  GenericColumnKey,
  suggestedQuantity,
} from '@openmsupply-client/common';

interface UseRequestColumnOptions {
  sortBy: SortBy<RequestLineFragment>;
  onChangeSortBy: (
    column: Column<RequestLineFragment>
  ) => SortBy<RequestLineFragment>;
}

export const useRequestColumns = ({
  sortBy,
  onChangeSortBy,
}: UseRequestColumnOptions): Column<RequestLineFragment>[] => {
  const t = useTranslation('common');
  return useColumns<RequestLineFragment>(
    [
      [
        'itemCode',
        { width: 100, accessor: ({ rowData }) => rowData.item.code },
      ],
      [
        'itemName',
        { width: 350, accessor: ({ rowData }) => rowData.item.name },
      ],

      [
        'monthlyConsumption',
        {
          width: 200,
          accessor: ({ rowData }) =>
            rowData.itemStats.averageMonthlyConsumption,
        },
      ],

      {
        key: 'availableStockOnHand',
        label: 'label.stock-on-hand',
        description: 'description.stock-on-hand',
        align: ColumnAlign.Left,

        width: 200,
        accessor: ({ rowData }) => {
          const { itemStats } = rowData;
          const { availableStockOnHand, availableMonthsOfStockOnHand } =
            itemStats;

          const monthsString = availableMonthsOfStockOnHand
            ? `(${availableMonthsOfStockOnHand} ${t('label.month', {
                count: availableMonthsOfStockOnHand,
              })})`
            : '';
          return `${availableStockOnHand} ${monthsString}`;
        },
      },

      {
        key: 'suggestedQuantity',
        label: 'label.forecast-quantity',
        description: 'description.forecast-quantity',
        align: ColumnAlign.Right,
        width: 200,
        accessor: ({ rowData }) => {
          // TODO: Use requisition months of stock here rather than hard coded
          // '3'.
          const suggested = suggestedQuantity(
            rowData.itemStats.averageMonthlyConsumption,
            rowData.itemStats.availableStockOnHand,
            3
          );
          if (suggested > 0) {
            return suggested.toFixed(2);
          } else {
            return 0;
          }
        },
      },
      {
        key: 'requestedQuantity',
        label: 'label.requested-quantity',
        align: ColumnAlign.Right,
        width: 200,
      },
      ['comment', { width: 300 }],
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
};
