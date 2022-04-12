import { useEffect } from 'react';
import { RequestLineFragment } from '../api/operations.generated';
import {
  useTranslation,
  ColumnAlign,
  useColumns,
  GenericColumnKey,
  QuantityUtils,
  useSortBy,
  SortBy,
  zustand,
  getCommentPopoverColumn,
} from '@openmsupply-client/common';
import { useRequestFields } from '../api';

type Store = {
  sortBy: SortBy<RequestLineFragment>;
  setSortBy: (sortBy: SortBy<RequestLineFragment>) => void;
};

const useStore = zustand<Store>(set => ({
  sortBy: { key: 'itemName', isDesc: false, direction: 'asc' },
  setSortBy: (sortBy: SortBy<RequestLineFragment>) =>
    set(state => ({ ...state, sortBy })),
}));

const useSharedSortBy = () => {
  const sharedSortBy = useStore();
  const { sortBy, onChangeSortBy } = useSortBy<RequestLineFragment>(
    sharedSortBy.sortBy
  );

  useEffect(() => {
    sharedSortBy.setSortBy(sortBy);
  }, [sortBy]);
  return { sortBy, onChangeSortBy };
};

export const useRequestColumns = () => {
  const t = useTranslation('common');
  const { maxMonthsOfStock } = useRequestFields('maxMonthsOfStock');
  const { sortBy, onChangeSortBy } = useSharedSortBy();
  const columns = useColumns<RequestLineFragment>(
    [
      getCommentPopoverColumn(),
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
        key: 'suggestedQuantity',
        label: 'label.forecast-quantity',
        description: 'description.forecast-quantity',
        align: ColumnAlign.Right,
        width: 200,
        accessor: ({ rowData }) =>
          QuantityUtils.suggestedQuantity(
            rowData.itemStats.averageMonthlyConsumption,
            rowData.itemStats.availableStockOnHand,
            maxMonthsOfStock
          ),
        getSortValue: rowData =>
          QuantityUtils.suggestedQuantity(
            rowData.itemStats.averageMonthlyConsumption,
            rowData.itemStats.availableStockOnHand,
            maxMonthsOfStock
          ),
      },
      {
        key: 'requestedQuantity',
        label: 'label.requested-quantity',
        align: ColumnAlign.Right,
        width: 150,
        getSortValue: rowData => rowData.requestedQuantity,
      },
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
