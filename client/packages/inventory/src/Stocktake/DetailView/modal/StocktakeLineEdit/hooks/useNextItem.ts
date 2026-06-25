import { useState } from 'react';
import { StocktakeLineFragment } from 'packages/inventory/src/Stocktake/api';

export const useNextItem = (
  getSortedItems: () => StocktakeLineFragment['item'][],
  currentItemId?: string
): StocktakeLineFragment['item'] | null => {
  const [items] = useState(getSortedItems);

  if (!items || !currentItemId) return null;

  const currentIdx = items.findIndex(item => item?.id === currentItemId);
  const nextItem = items[currentIdx + 1];

  if (currentIdx === -1 || !nextItem) return null;

  return nextItem ?? null;
};
