import { Item } from '@openmsupply-client/common';
import { toItem } from '@openmsupply-client/system';
import { useOutboundRows } from '../../../api';

export const useNextItem = (currentItemId?: string): Item | null => {
  const { items } = useOutboundRows();
  if (!items || !currentItemId) return null;

  const numberOfItems = items.length;
  const currentIdx = items.findIndex(({ itemId }) => itemId === currentItemId);
  const nextItem = items[(currentIdx + 1) % numberOfItems];

  if (currentIdx === -1 || currentIdx === numberOfItems - 1 || !nextItem) {
    return null;
  }

  return toItem(nextItem);
};
