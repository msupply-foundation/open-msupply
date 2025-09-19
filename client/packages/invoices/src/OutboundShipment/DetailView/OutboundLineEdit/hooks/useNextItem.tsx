import { ItemRowFragment } from '@openmsupply-client/system';

export const useNextItem = (
  items: ItemRowFragment[] | undefined,
  currentItemId?: string
): { next: ItemRowFragment | null; disabled: boolean } => {
  const next: ItemRowFragment | null = null;
  const disabled = true;

  if (!items || !currentItemId) return { next, disabled };

  const numberOfItems = items.length;
  const currentIdx = items.findIndex(({ id }) => id === currentItemId);
  const nextIdx = currentIdx + 1;
  const nextItem = items[nextIdx];

  if (currentIdx === -1 || !nextItem) {
    return { next, disabled };
  }

  return {
    next: nextItem,
    disabled: currentIdx === numberOfItems - 1,
  };
};
