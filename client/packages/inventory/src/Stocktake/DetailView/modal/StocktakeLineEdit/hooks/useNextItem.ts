import { ItemRowFragment } from '@openmsupply-client/system';
import { useStocktake } from '../../../../api';

export const useNextItem = (currentItemId?: string): ItemRowFragment | null => {
  const { items } = useStocktake.line.rows();
  if (!items || !currentItemId) return null;

  const numberOfItems = items.length;
  const currentIdx = items.findIndex(({ item }) => item?.id === currentItemId);
  const nextItem = items[(currentIdx + 1) % numberOfItems];

  if (currentIdx === -1 || currentIdx === numberOfItems - 1 || !nextItem) {
    return null;
  }

  return nextItem.item ?? null;
};
