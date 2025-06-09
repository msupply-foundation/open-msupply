import { useCallback, useEffect, useState } from 'react';
import { useResponse, ResponseLineFragment, ResponseFragment } from '../../api';
import { ItemWithStatsFragment } from '@openmsupply-client/system';
import { FnUtils } from '@common/utils';

export type DraftResponseLine = Omit<
  ResponseLineFragment,
  '__typename' | 'item'
> & {
  requisitionId: string;
  isCreated: boolean;
};

const createDraftFromItem = (
  item: ItemWithStatsFragment,
  requisition: ResponseFragment
): DraftResponseLine => {
  return {
    id: FnUtils.generateUUID(),
    itemId: item.id,
    requisitionId: requisition.id,
    requisitionNumber: requisition.requisitionNumber,
    itemName: item.name,
    requestedQuantity: 0,
    supplyQuantity: 0,
    initialStockOnHandUnits: 0,
    incomingUnits: 0,
    outgoingUnits: 0,
    lossInUnits: 0,
    additionInUnits: 0,
    daysOutOfStock: 0,
    expiringUnits: 0,
    remainingQuantityToSupply: 0,
    averageMonthlyConsumption: 0,
    approvedQuantity: 0,
    alreadyIssued: 0,
    availableStockOnHand: 0,
    suggestedQuantity: 0,
    isCreated: true,
    itemStats: {
      __typename: 'ItemStatsNode',
      stockOnHand: 0,
      availableMonthsOfStockOnHand: 0,
      averageMonthlyConsumption: 0,
    },
  };
};

const createDraftFromResponseLine = (
  line: ResponseLineFragment
): DraftResponseLine => ({
  ...line,
  isCreated: false,
});

export const useDraftRequisitionLine = (
  item?: ItemWithStatsFragment | null
) => {
  const { lines } = useResponse.line.list();
  const { data } = useResponse.document.get();
  const { mutateAsync: saveMutation, isLoading } = useResponse.line.save();

  const [draft, setDraft] = useState<DraftResponseLine | null>(null);

  useEffect(() => {
    if (lines && item && data) {
      const existingLine = lines.find(
        ({ item: reqItem }) => reqItem.id === item.id
      );
      if (existingLine) {
        setDraft(createDraftFromResponseLine(existingLine));
      } else {
        setDraft(createDraftFromItem(item, data));
      }
    } else {
      setDraft(null);
    }
  }, [lines, item, data]);

  const update = useCallback((patch: Partial<DraftResponseLine>) => {
    setDraft(current => (current ? { ...current, ...patch } : null));
  }, []);

  const save = useCallback(async () => {
    if (draft) {
      const result = await saveMutation(draft);
      return result;
    }
    return null;
  }, [draft, saveMutation]);

  return { draft, isLoading, save, update };
};

export const useNextResponseLine = (
  lines: ResponseLineFragment[],
  currentItem?: ItemWithStatsFragment | null
) => {
  if (!lines || !currentItem) {
    return { hasNext: false, next: null };
  }
  const nextState: {
    hasNext: boolean;
    next: ItemWithStatsFragment | null;
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
