import { useInbound } from '..';
import { InboundLineFragment } from '../../operations.generated';

type InboundLineItem = InboundLineFragment['item'];

export const useNextItem = (
  currentItemId: string
): { next: InboundLineItem | null; disabled: boolean } => {
  const next: InboundLineItem | null = null;
  const disabled = true;
  const { items } = useInbound.lines.rows();

  if (!items) return { next, disabled };

  const numberOfItems = items.length;
  const currentIndex = items.findIndex(
    ({ itemId }) => itemId === currentItemId
  );
  const nextIndex = currentIndex + 1;
  const nextItem = items?.[nextIndex];
  if (!nextItem) return { next, disabled };

  return {
    next: nextItem.lines[0]?.item || null,
    disabled: currentIndex === numberOfItems - 1,
  };
};
