import { useMemo } from 'react';
import { SortUtils, useItemUtils } from '@openmsupply-client/common';
import { useRequestColumns } from '../../../DetailView/columns';
import { useHideOverStocked } from '../index';
import { useRequestFields } from '../document/useRequestFields';

export const useRequestLines = (draftItemId?: string) => {
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
      return sorted?.filter(({ item, itemStats }) => {
        const passesFilter =
          (itemStats.availableStockOnHand === 0 &&
            itemStats.averageMonthlyConsumption === 0) ||
          (itemStats.availableStockOnHand <
            itemStats.averageMonthlyConsumption * threshold &&
            matchItem(itemFilter, item));

        // need to account for draft item here
        const isDraftItem = draftItemId && item.id === draftItemId;
        return passesFilter || isDraftItem;
      });
    } else {
      return sorted?.filter(item => matchItem(itemFilter, item.item));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sortBy.key,
    sortBy.isDesc,
    lines,
    on,
    minMonthsOfStock,
    itemFilter,
    draftItemId,
  ]);

  return {
    lines: sorted,
    sortBy,
    onChangeSortBy,
    columns,
    itemFilter,
    setItemFilter,
  };
};
