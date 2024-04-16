import { useCallback, useState } from 'react';
import { AdjustmentTypeInput, useMutation } from '@openmsupply-client/common';
import {
  InventoryAdjustmentReasonRowFragment,
  StockLineRowFragment,
} from '../../..';
import { STOCK_LINE } from './keys';
import { useStockGraphQL } from '../useStockGraphQL';

type DraftInventoryAdjustment = {
  reason: InventoryAdjustmentReasonRowFragment | null;
  adjustment: number;
  adjustmentType: AdjustmentTypeInput;
};

export function useInventoryAdjustment(stockLine: StockLineRowFragment) {
  const [draft, setDraft] = useState<DraftInventoryAdjustment>({
    reason: null,
    adjustment: 0,
    adjustmentType: AdjustmentTypeInput.Addition,
  });

  const { mutateAsync: createMutation } = useCreate(stockLine.id);

  const create = useCallback(async () => {
    await createMutation(draft);
    setDraft({
      reason: null,
      adjustment: 0,
      adjustmentType: AdjustmentTypeInput.Addition,
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
      adjustment,
      adjustmentType,
      reason,
    }: DraftInventoryAdjustment) => {
      // TODO: error helper to handle structured/standard errors
      return await stockApi.createInventoryAdjustment({
        storeId,
        input: {
          adjustment,
          adjustmentType,
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
