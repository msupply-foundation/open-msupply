import { ItemWithPackSizeFragment } from '@openmsupply-client/system';
import { useInboundItems } from '../line/useInboundItems';

export const useNextItem = (
  currentItemId: string
): { next: ItemWithPackSizeFragment | null; disabled: boolean } => {
  const next: ItemWithPackSizeFragment | null = null;
  const disabled = true;
  const { data } = useInboundItems();

  if (!data) return { next, disabled };

  const numberOfItems = data.length;
  const currentIndex = data.findIndex(({ itemId }) => itemId === currentItemId);
  const nextIndex = currentIndex + 1;
  const nextItem = data?.[nextIndex];
  if (!nextItem) return { next, disabled };

  return {
    next: nextItem.lines[0]?.item || null,
    disabled: currentIndex === numberOfItems - 1,
  };
};
