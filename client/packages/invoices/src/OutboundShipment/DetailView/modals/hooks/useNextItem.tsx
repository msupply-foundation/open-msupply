import { Item } from '@openmsupply-client/common';
import { toItem } from '@openmsupply-client/system';
import { useOutboundRows } from '../../../api';

export const useNextItem = (
  currentItemId?: string
): { next: Item | null; disabled: boolean } => {
  const next: Item | null = null;
  const disabled = true;

  const { items } = useOutboundRows();

  if (!items || !currentItemId) return { next, disabled };

  const numberOfItems = items.length;
  const currentIdx = items.findIndex(({ itemId }) => itemId === currentItemId);
  const nextIdx = currentIdx + 1;
  const nextItem = items[nextIdx];

  if (currentIdx === -1 || !nextItem) {
    return { next, disabled };
  }

  return {
    next: toItem(nextItem.lines[0]),
    disabled: currentIdx === numberOfItems - 1,
  };
};
