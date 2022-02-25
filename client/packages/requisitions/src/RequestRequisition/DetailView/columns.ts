import { RequestRequisitionLineFragment } from '../api/operations.generated';
import {
  useTranslation,
  ColumnAlign,
  useColumns,
  Column,
  SortBy,
  GenericColumnKey,
  suggestedQuantity,
} from '@openmsupply-client/common';

interface UseRequestRequisitionColumnOptions {
  sortBy: SortBy<RequestRequisitionLineFragment>;
  onChangeSortBy: (
    column: Column<RequestRequisitionLineFragment>
  ) => SortBy<RequestRequisitionLineFragment>;
}

export const useRequestRequisitionColumns = ({
  sortBy,
  onChangeSortBy,
}: UseRequestRequisitionColumnOptions): Column<RequestRequisitionLineFragment>[] => {
  const t = useTranslation('common');
  return useColumns<RequestRequisitionLineFragment>(
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
        align: ColumnAlign.Left,

        width: 200,
        accessor: ({ rowData }) => {
          const { itemStats } = rowData;
          const { availableStockOnHand, availableMonthsOfStockOnHand } =
            itemStats;

          const monthsString = availableMonthsOfStockOnHand
            ? `${availableMonthsOfStockOnHand} ${t('label.months')}`
            : '';
          return `${availableStockOnHand} ${monthsString}`;
        },
      },

      {
        key: 'suggestedQuantity',
        label: 'label.forecast-quantity',
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
