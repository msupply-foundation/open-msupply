import { useMemo } from 'react';
import { useItemUtils } from '@openmsupply-client/common';
import { useHideOverStocked } from '../index';
import { useRequestFields } from '../document/useRequestFields';

export const useRequestLines = (draftItemId?: string) => {
  const { on } = useHideOverStocked();
  const { itemFilter, setItemFilter } = useItemUtils();
  const { lines, minMonthsOfStock, maxMonthsOfStock, isFetching, isError } =
    useRequestFields(['lines', 'minMonthsOfStock', 'maxMonthsOfStock']);

  const threshold = minMonthsOfStock ?? maxMonthsOfStock;

  const filterOverstocked = useMemo(() => {
    if (!on) return lines?.nodes;

    return lines?.nodes.filter(({ item, itemStats }) => {
      const passesFilter =
        (itemStats.availableStockOnHand === 0 &&
          itemStats.averageMonthlyConsumption === 0) ||
        itemStats.availableStockOnHand <
          itemStats.averageMonthlyConsumption * threshold;

      // need to account for draft item here
      const isDraftItem = draftItemId && item.id === draftItemId;
      return passesFilter || isDraftItem;
    });
  }, [lines, on, threshold, draftItemId]);

  return {
    lines: filterOverstocked,
    itemFilter,
    setItemFilter,
    isFetching,
    isError,
  };
};
