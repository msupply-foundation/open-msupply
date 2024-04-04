import { useCallback, useState } from 'react';
import {
  useAuthContext,
  useGql,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import {
  Adjustment,
  InventoryAdjustmentReasonRowFragment,
  StockLineRowFragment,
} from '../../..';
import { getSdk } from '..';

type DraftInventoryAdjustment = {
  direction: Adjustment;
  reason: InventoryAdjustmentReasonRowFragment | null;
  adjustBy: number;
  newNumberOfPacks: number;
};

export function useInventoryAdjustment(stockLine: StockLineRowFragment) {
  // would usually query data here

  // can then manage state (buffered too?) - can expose debounced update from here
  const [draft, setDraft] = useState<DraftInventoryAdjustment>({
    direction: Adjustment.None,
    reason: null,
    adjustBy: 0,
    newNumberOfPacks: 0,
  });

  const { mutateAsync: createMutation } = useCreate(stockLine.id);
  // could then also have update mutation here

  const create = useCallback(async () => {
    await createMutation(draft);
    setDraft({
      direction: Adjustment.None,
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
  const { client } = useGql();
  const sdk = getSdk(client);
  const queryClient = useQueryClient();
  const { storeId } = useAuthContext();

  return useMutation(
    async ({
      direction,
      newNumberOfPacks,
      reason,
    }: DraftInventoryAdjustment) => {
      if (!direction) return;
      return sdk.createInventoryAdjustment({
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

        // TODO, where to store query keys?
        // these are same as in useStockApi
        queryClient.invalidateQueries(['stock', storeId, stockLineId]),
    }
  );
};
