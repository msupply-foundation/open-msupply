import { useState, useEffect } from 'react';
import { FnUtils, QuantityUtils } from '@openmsupply-client/common';
import {
  useRequest,
  RequestLineFragment,
  ItemWithStatsFragment,
  RequestFragment,
} from '../../api';

export type DraftRequestLine = Omit<
  RequestLineFragment,
  '__typename' | 'item'
> & {
  isCreated: boolean;
  requisitionId: string;
  defaultPackSize: number;
};

const createDraftFromItem = (
  item: ItemWithStatsFragment,
  request: RequestFragment
): DraftRequestLine => {
  const { stats } = item;
  const { averageMonthlyConsumption, availableStockOnHand } = stats;
  const suggested = QuantityUtils.suggestedQuantity(
    averageMonthlyConsumption,
    availableStockOnHand,
    request.maxMonthsOfStock
  );

  return {
    id: FnUtils.generateUUID(),
    requisitionId: request.id,
    itemId: item.id,
    requestedQuantity: suggested,
    suggestedQuantity: suggested,
    isCreated: true,
    itemStats: item.stats,
    itemName: item.name,
    requisitionNumber: request.requisitionNumber,
    initialStockOnHandUnits: 0,
    incomingUnits: 0,
    outgoingUnits: 0,
    lossInUnits: 0,
    additionInUnits: 0,
    daysOutOfStock: 0,
    expiringUnits: 0,
    defaultPackSize: item.defaultPackSize,
  };
};

const createDraftFromRequestLine = (
  line: RequestLineFragment,
  request: RequestFragment
): DraftRequestLine => ({
  ...line,
  requisitionId: request.id,
  itemId: line.item.id,
  requestedQuantity: line.requestedQuantity ?? line.suggestedQuantity,
  suggestedQuantity: line.suggestedQuantity,
  isCreated: false,
  itemStats: line.itemStats,
  defaultPackSize: line.item.defaultPackSize,
});

export const useDraftRequisitionLine = (
  item?: ItemWithStatsFragment | null
) => {
  const { lines } = useRequest.line.list();
  const { data } = useRequest.document.get();
  const { mutateAsync: save, isLoading } = useRequest.line.save();

  const [draft, setDraft] = useState<DraftRequestLine | null>(null);

  useEffect(() => {
    if (lines && item && data) {
      const existingLine = lines.find(
        ({ item: reqItem }) => reqItem.id === item.id
      );
      if (existingLine) {
        setDraft(createDraftFromRequestLine(existingLine, data));
      } else {
        setDraft(createDraftFromItem(item, data));
      }
    } else {
      setDraft(null);
    }
  }, [lines, item, data]);

  const update = (patch: Partial<DraftRequestLine>) => {
    if (draft) {
      setDraft({ ...draft, ...patch });
    }
  };

  return { draft, isLoading, save: () => draft && save(draft), update };
};

export const usePreviousNextRequestLine = (
  lines?: RequestLineFragment[],
  currentItem?: ItemWithStatsFragment | null
) => {
  if (!lines || !currentItem) {
    return { hasNext: false, next: null, hasPrevious: false, previous: null };
  }

  const state: {
    hasPrevious: boolean;
    previous: null | ItemWithStatsFragment;
    hasNext: boolean;
    next: null | ItemWithStatsFragment;
  } = { hasNext: true, next: null, hasPrevious: true, previous: null };
  const idx = lines.findIndex(l => l.item.id === currentItem?.id);
  const previous = lines[idx - 1];
  const next = lines[idx + 1];

  if (!previous) {
    state.hasPrevious = false;
  } else {
    state.previous = previous.item;
  }

  if (!next) {
    state.hasNext = false;
  } else {
    state.next = next.item;
  }

  return state;
};
