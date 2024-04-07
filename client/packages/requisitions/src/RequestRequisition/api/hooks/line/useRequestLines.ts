import { useMemo } from 'react';
import { SortUtils, useItemUtils } from '@openmsupply-client/common';
import { useRequestColumns } from '../../../DetailView/columns';
import { useHideOverStocked } from '../index';
import { useRequestFields } from '../document/useRequestFields';

export const useRequestLines = () => {
  const { on } = useHideOverStocked();
  const { itemFilter, setItemFilter, matchItem } = useItemUtils();
  const { columns, onChangeSortBy, sortBy } = useRequestColumns();
  const { lines, minMonthsOfStock, maxMonthsOfStock } = useRequestFields([
    'lines',
    'minMonthsOfStock',
    'maxMonthsOfStock',
  ]);

  const sorted = useMemo(() => {
    const threshold = minMonthsOfStock ?? maxMonthsOfStock;
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    const { getSortValue } = currentColumn ?? {};
    const sorted = getSortValue
      ? lines?.nodes.sort(
          SortUtils.getColumnSorter(getSortValue, !!sortBy.isDesc)
        )
      : lines?.nodes;

    if (on) {
      return sorted.filter(
        ({ item, itemStats }) =>
          (itemStats.availableStockOnHand === 0 &&
            itemStats.averageMonthlyConsumption === 0) ||
          (itemStats.availableStockOnHand <
            itemStats.averageMonthlyConsumption * threshold &&
            matchItem(itemFilter, item))
      );
    } else {
      return sorted.filter(item => matchItem(itemFilter, item.item));
    }
  }, [sortBy.key, sortBy.isDesc, lines, on, minMonthsOfStock, itemFilter]);

  return {
    lines: sorted,
    sortBy,
    onChangeSortBy,
    columns,
    itemFilter,
    setItemFilter,
  };
};
