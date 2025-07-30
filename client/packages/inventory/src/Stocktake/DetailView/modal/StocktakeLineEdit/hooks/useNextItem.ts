import { StocktakeSummaryItem } from '@openmsupply-client/inventory/src/types';
import { StocktakeLineFragment } from 'packages/inventory/src/Stocktake/api';

export const useNextItem = (
  items: StocktakeSummaryItem[],
  currentItemId?: string
): StocktakeLineFragment['item'] | null => {
  if (!items || !currentItemId) return null;

  const numberOfItems = items.length;
  const currentIdx = items.findIndex(({ item }) => item?.id === currentItemId);
  const nextItem = items[(currentIdx + 1) % numberOfItems];

  if (currentIdx === -1 || currentIdx === numberOfItems - 1 || !nextItem) {
    return null;
  }

  return nextItem.item ?? null;
};
