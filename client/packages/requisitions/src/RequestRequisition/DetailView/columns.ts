import { RequestLineFragment } from '../api/operations.generated';
import {
  useTranslation,
  ColumnAlign,
  useColumns,
  GenericColumnKey,
  suggestedQuantity,
  useSortBy,
} from '@openmsupply-client/common';
import { useRequestFields } from '../api';

export const useRequestColumns = () => {
  const t = useTranslation('common');
  const { maxMonthsOfStock } = useRequestFields('maxMonthsOfStock');
  const { sortBy, onChangeSortBy } = useSortBy<RequestLineFragment>({
    key: 'itemName',
    isDesc: false,
  });
  const columns = useColumns<RequestLineFragment>(
    [
      [
        'itemCode',
        {
          width: 100,
          accessor: ({ rowData }) => rowData.item.code,
          getSortValue: rowData => rowData.item.code,
        },
      ],
      [
        'itemName',
        {
          width: 350,
          accessor: ({ rowData }) => rowData.item.name,
          getSortValue: rowData => rowData.item.name,
        },
      ],

      [
        'monthlyConsumption',
        {
          width: 150,
          accessor: ({ rowData }) =>
            rowData.itemStats.averageMonthlyConsumption,
          getSortValue: rowData => rowData.itemStats.averageMonthlyConsumption,
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
        getSortValue: rowData => rowData.itemStats.availableStockOnHand,
      },

      {
        key: 'suggestedQuantity',
        label: 'label.forecast-quantity',
        description: 'description.forecast-quantity',
        align: ColumnAlign.Right,
        width: 200,
        accessor: ({ rowData }) =>
          suggestedQuantity(
            rowData.itemStats.averageMonthlyConsumption,
            rowData.itemStats.availableStockOnHand,
            maxMonthsOfStock
          ),
        getSortValue: rowData =>
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
        getSortValue: rowData =>
          rowData.itemStats.averageMonthlyConsumption * maxMonthsOfStock,
      },
      {
        key: 'requestedQuantity',
        label: 'label.requested-quantity',
        align: ColumnAlign.Right,
        width: 150,
        getSortValue: rowData => rowData.requestedQuantity,
      },
      [
        'comment',
        { width: 300, getSortValue: rowData => rowData.comment ?? '' },
      ],
      GenericColumnKey.Selection,
    ],
    {
      onChangeSortBy,
      sortBy,
    },
    [onChangeSortBy, sortBy]
  );

  return { columns, sortBy, onChangeSortBy };
};
