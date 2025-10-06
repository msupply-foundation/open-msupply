import { useMemo } from 'react';
import { SortUtils, useItemUtils } from '@openmsupply-client/common';
import { useRequestColumns } from '../../../DetailView/columns';
import { useHideOverStocked } from '../index';
import { useRequestFields } from '../document/useRequestFields';

export const useRequestLines = () => {
  const { on } = useHideOverStocked();
  const { itemFilter, setItemFilter, matchItem } = useItemUtils();
  const { lines, minMonthsOfStock, maxMonthsOfStock, isFetching, isError } =
    useRequestFields(['lines', 'minMonthsOfStock', 'maxMonthsOfStock']);

  // are ther eother url sorts?????

  // const sorted = useMemo(() => {
  //   const threshold = minMonthsOfStock ?? maxMonthsOfStock;
  //   const currentColumn = columns.find(({ key }) => key === sortBy.key);
  //   const { getSortValue } = currentColumn ?? {};
  //   const sorted = getSortValue
  //     ? lines?.nodes.sort(
  //         SortUtils.getColumnSorter(getSortValue, !!sortBy.isDesc)
  //       )
  //     : lines?.nodes;

  //   if (on) {
  //     return sorted?.filter(
  //       ({ item, itemStats }) =>
  //         (itemStats.availableStockOnHand === 0 &&
  //           itemStats.averageMonthlyConsumption === 0) ||
  //         (itemStats.availableStockOnHand <
  //           itemStats.averageMonthlyConsumption * threshold &&
  //           matchItem(itemFilter, item))
  //     );
  //   } else {
  //     return sorted?.filter(item => matchItem(itemFilter, item.item));
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [sortBy.key, sortBy.isDesc, lines, on, minMonthsOfStock, itemFilter]);

  const sorted = useMemo(
    () =>
      (lines.nodes ?? []).sort((a, b) =>
        a.item.name.localeCompare(b.item.name)
      ),
    []
  );

  return {
    lines: sorted,
    itemFilter,
    setItemFilter,
    isFetching,
    isError,
  };
};
