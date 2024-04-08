import { useCallback, useState } from 'react';
import { useMutation } from '@openmsupply-client/common';
import {
  Adjustment,
  InventoryAdjustmentReasonRowFragment,
  StockLineRowFragment,
} from '../../..';
import { STOCK_LINE } from './keys';
import { useStockGraphQL } from '../useStockGraphQL';

type DraftInventoryAdjustment = {
  direction: Adjustment;
  reason: InventoryAdjustmentReasonRowFragment | null;
  adjustBy: number;
  newNumberOfPacks: number;
};

export function useInventoryAdjustment(stockLine: StockLineRowFragment) {
  const [draft, setDraft] = useState<DraftInventoryAdjustment>({
    direction: Adjustment.Addition,
    reason: null,
    adjustBy: 0,
    newNumberOfPacks: stockLine.totalNumberOfPacks,
  });

  const { mutateAsync: createMutation } = useCreate(stockLine.id);

  const create = useCallback(async () => {
    await createMutation(draft);
    setDraft({
      direction: Adjustment.Addition,
      reason: null,
      adjustBy: 0,
      newNumberOfPacks: 0,
    });
  }, [draft, createMutation]);

  return {
    draft,
    setDraft,
    create,
  };
}

const useCreate = (stockLineId: string) => {
  const { stockApi, storeId, queryClient } = useStockGraphQL();

  return useMutation(
    async ({
      direction,
      newNumberOfPacks,
      reason,
    }: DraftInventoryAdjustment) => {
      if (!direction) return;
      // TODO: error helper to handle structured/standard errors
      return await stockApi.createInventoryAdjustment({
        storeId,
        input: {
          newNumberOfPacks,
          stockLineId,
          inventoryAdjustmentReasonId: reason?.id,
        },
      });
    },
    {
      onSuccess: () =>
        // Stock line needs to be re-fetched to refresh quantity
        queryClient.invalidateQueries([STOCK_LINE]),
    }
  );
};
