import { ItemRowFragment, toItemRow } from '@openmsupply-client/system';
import { useOutbound } from '../../../api';

export const useNextItem = (
  currentItemId?: string
): { next: ItemRowFragment | null; disabled: boolean } => {
  const next: ItemRowFragment | null = null;
  const disabled = true;

  const { items } = useOutbound.line.rows();

  if (!items || !currentItemId) return { next, disabled };

  const numberOfItems = items.length;
  const currentIdx = items.findIndex(({ itemId }) => itemId === currentItemId);
  const nextIdx = currentIdx + 1;
  const nextItem = items[nextIdx];

  if (currentIdx === -1 || !nextItem) {
    return { next, disabled };
  }

  return {
    next: toItemRow(nextItem),
    disabled: currentIdx === numberOfItems - 1,
  };
};
