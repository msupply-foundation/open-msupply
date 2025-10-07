import { useState, useEffect, useCallback } from 'react';
import {
  FnUtils,
  QuantityUtils,
  useTranslation,
} from '@openmsupply-client/common';
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
  };
};

const createDraftFromRequestLine = (
  line: RequestLineFragment,
  request: RequestFragment
): DraftRequestLine => ({
  ...line,
  requisitionId: request.id,
  itemId: line.item.id,
  requestedQuantity: line.requestedQuantity,
  suggestedQuantity: line.suggestedQuantity,
  isCreated: false,
  itemStats: line.itemStats,
});

export const useDraftRequisitionLine = (
  item?: ItemWithStatsFragment | null
) => {
  const t = useTranslation();
  const [isReasonsError, setIsReasonsError] = useState(false);
  const { lines } = useRequest.line.list(item?.id);
  const { data } = useRequest.document.get();
  const { mutateAsync: saveMutation, isLoading } = useRequest.line.save();

  const [draft, setDraft] = useState<DraftRequestLine | null>(null);
  useEffect(() => {
    if (isReasonsError) {
      return;
    }

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
  }, [lines, item, data, isReasonsError]);

  const update = useCallback((patch: Partial<DraftRequestLine>) => {
    setDraft(current => (current ? { ...current, ...patch } : null));
  }, []);

  const save = useCallback(async () => {
    if (draft) {
      const result = await saveMutation(draft);

      setIsReasonsError(false);
      if (result?.__typename === 'UpdateRequestRequisitionLineError') {
        let errorMessage: string;

        switch (result.error.__typename) {
          case 'RequisitionReasonNotProvided':
            setIsReasonsError(true);
            errorMessage = t('error.provide-reason-requisition');
            break;
          case 'CannotEditRequisition':
            errorMessage = t('error.cannot-edit-requisition');
            break;
          default:
            errorMessage = t('error.database-error');
            break;
        }

        return {
          error: errorMessage,
        };
      }

      return {
        data: result,
      };
    }

    return null;
  }, [draft, saveMutation]);

  return {
    draft,
    isLoading,
    save,
    update,
    isReasonsError,
  };
};

export const useNextRequestLine = (
  lines?: RequestLineFragment[],
  currentItem?: ItemWithStatsFragment | null
) => {
  if (!lines || !currentItem) {
    return { hasNext: false, next: null };
  }

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
