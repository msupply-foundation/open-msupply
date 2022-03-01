import { useState, useEffect } from 'react';
import { generateUUID } from '@openmsupply-client/common';
import {
  useSaveRequestLines,
  useRequestRequisitionFields,
  useRequestRequisitionLines,
  RequestRequisitionLineFragment,
  ItemWithStatsFragment,
} from '../../api';

export type DraftRequestRequisitionLine = Omit<
  RequestRequisitionLineFragment,
  '__typename' | 'item' | 'itemStats'
> & {
  isCreated: boolean;
  requisitionId: string;
};

const createDraftFromItem = (
  item: ItemWithStatsFragment,
  requisitionId: string
): DraftRequestRequisitionLine => {
  const { stats } = item;
  const { averageMonthlyConsumption, availableStockOnHand } = stats;

  // TODO: Use months of stock from what has been set on the requisition,
  // not this arbitrary 3.
  const suggested = averageMonthlyConsumption * 3 - availableStockOnHand;
  const suggestedQuantity = Math.max(suggested, 0);
  return {
    id: generateUUID(),
    requisitionId,
    itemId: item.id,
    requestedQuantity: suggestedQuantity,
    suggestedQuantity,
    isCreated: true,
  };
};

const createDraftFromRequestLine = (
  line: RequestRequisitionLineFragment,
  id: string
): DraftRequestRequisitionLine => ({
  ...line,
  requisitionId: id,
  itemId: line.item.id,
  requestedQuantity: line.requestedQuantity ?? line.suggestedQuantity,
  suggestedQuantity: line.suggestedQuantity,
  isCreated: false,
});

export const useDraftRequisitionLine = (item: ItemWithStatsFragment | null) => {
  const { lines } = useRequestRequisitionLines();
  const { id: reqId } = useRequestRequisitionFields('id');
  const { mutate: save, isLoading } = useSaveRequestLines();

  const [draft, setDraft] = useState<DraftRequestRequisitionLine | null>(null);

  useEffect(() => {
    if (lines && item) {
      const existingLine = lines.find(
        ({ item: reqItem }) => reqItem.id === item.id
      );
      if (existingLine) {
        setDraft(createDraftFromRequestLine(existingLine, reqId));
      } else {
        setDraft(createDraftFromItem(item, reqId));
      }
    } else {
      setDraft(null);
    }
  }, [lines, item, reqId]);

  const update = (patch: Partial<DraftRequestRequisitionLine>) => {
    if (draft) {
      setDraft({ ...draft, ...patch });
    }
  };

  return { draft, isLoading, save: () => draft && save(draft), update };
};

export const useNextRequestLine = (
  currentItem: ItemWithStatsFragment | null
) => {
  const { lines } = useRequestRequisitionLines();

  const nextState: {
    hasNext: boolean;
    next: null | ItemWithStatsFragment;
  } = { hasNext: true, next: null };

  const idx = lines.findIndex(l => l.item.id === currentItem?.id);
  const next = lines[idx + 1];
  if (!next) {
    nextState.hasNext = false;
    return nextState;
  }

  nextState.next = next.item;

  return nextState;
};
