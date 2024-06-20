import { useState } from 'react';
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

  const create = async () => {
    const result = await createMutation(draft);

    if (result.createInventoryAdjustment.__typename === 'InvoiceNode') {
      setDraft({
        reason: null,
        adjustment: 0,
        adjustmentType: AdjustmentTypeInput.Addition,
      });
      return;
    }

    const { error: adjustmentError } = result.createInventoryAdjustment;

    if (adjustmentError.__typename === 'StockLineReducedBelowZero') {
      return 'error.stocktake-has-stock-reduced-below-zero';
    }
  };

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
