import { useMemo } from 'react';
import { useItemUtils } from '@openmsupply-client/common';
import { useHideOverStocked } from '../index';
import { useRequestFields } from '../document/useRequestFields';

export const useRequestLines = (draftItemId?: string) => {
  const { on } = useHideOverStocked();
  const { itemFilter, setItemFilter, matchItem } = useItemUtils();
  const { lines, minMonthsOfStock, maxMonthsOfStock, isFetching, isError } =
    useRequestFields(['lines', 'minMonthsOfStock', 'maxMonthsOfStock']);

  const threshold = minMonthsOfStock ?? maxMonthsOfStock;

  const filteredLines = useMemo(() => {
    const threshold = minMonthsOfStock ?? maxMonthsOfStock;

    const filteredLines = lines?.nodes?.filter(item =>
      matchItem(itemFilter, item.item)
    );
    if (!on) return filteredLines;

    return filteredLines.filter(({ item, itemStats }) => {
      const passesFilter =
        (itemStats.availableStockOnHand === 0 &&
          itemStats.averageMonthlyConsumption === 0) ||
        itemStats.availableStockOnHand <
          itemStats.averageMonthlyConsumption * threshold;

      // need to account for draft item here
      const isDraftItem = draftItemId && item.id === draftItemId;
      return passesFilter || isDraftItem;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, on, threshold, itemFilter, draftItemId]);

  return {
    lines: filteredLines,
    itemFilter,
    setItemFilter,
    isFetching,
    isError,
  };
};
