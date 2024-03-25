import { ItemRowFragment } from '@openmsupply-client/system';
import { StocktakeSummaryItem } from '@openmsupply-client/inventory/src/types';

export const useNextItem = (
  items: StocktakeSummaryItem[],
  currentItemId?: string
): ItemRowFragment | null => {
  if (!items || !currentItemId) return null;

  const numberOfItems = items.length;
  const currentIdx = items.findIndex(({ item }) => item?.id === currentItemId);
  const nextItem = items[(currentIdx + 1) % numberOfItems];

  if (currentIdx === -1 || currentIdx === numberOfItems - 1 || !nextItem) {
    return null;
  }

  return nextItem.item ?? null;
};
