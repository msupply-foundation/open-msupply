import { useState } from 'react';
import { ItemRowFragment } from '@openmsupply-client/system';

export const useNextItem = (
  getSortedItems: () => ItemRowFragment[],
  currentItemId?: string
): { next: ItemRowFragment | null; disabled: boolean } => {
  const [items] = useState(getSortedItems());

  if (!items || !currentItemId) return { next: null, disabled: true };

  const numberOfItems = items.length;
  const currentIdx = items.findIndex(({ id }) => id === currentItemId);
  const nextIdx = currentIdx + 1;
  const nextItem = items[nextIdx];

  if (currentIdx === -1 || !nextItem) {
    return { next: null, disabled: true };
  }

  return {
    next: nextItem,
    disabled: currentIdx === numberOfItems - 1,
  };
};
