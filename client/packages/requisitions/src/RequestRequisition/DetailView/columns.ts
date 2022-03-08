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
import { useRequestFields } from '../api';

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
  const { maxMonthsOfStock } = useRequestFields('maxMonthsOfStock');
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
          width: 150,
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
            ? `(${availableMonthsOfStockOnHand.toFixed(2)} ${t('label.months', {
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
        width: 150,
        accessor: ({ rowData }) =>
          suggestedQuantity(
            rowData.itemStats.averageMonthlyConsumption,
            rowData.itemStats.availableStockOnHand,
            maxMonthsOfStock
          ),
      },
      {
        key: 'targetStock',
        label: 'label.target-stock',
        align: ColumnAlign.Right,
        width: 150,
        accessor: ({ rowData }) =>
          rowData.itemStats.averageMonthlyConsumption * maxMonthsOfStock,
      },
      {
        key: 'requestedQuantity',
        label: 'label.requested-quantity',
        align: ColumnAlign.Right,
        width: 150,
      },
      ['comment', { width: 300 }],
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
};
