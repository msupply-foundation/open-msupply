import { useCallback, useState } from 'react';
import {
  AdjustmentDirectionInput,
  useAuthContext,
  useGql,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import {
  InventoryAdjustmentReasonRowFragment,
  StockLineRowFragment,
} from '../../..';
import { getSdk } from '..';

type DraftInventoryAdjustment = {
  direction: AdjustmentDirectionInput | null;
  reason: InventoryAdjustmentReasonRowFragment | null;
  adjustBy: number;
  newNumberOfPacks: number;
};

export function useInventoryAdjustment(stockLine: StockLineRowFragment) {
  // would usually query data here

  // manage state (buffered) - can expose debounced update from here
  // is it easier to have a targetted hook or all options exp
  const [draft, setDraft] = useState<DraftInventoryAdjustment>({
    direction: null,
    reason: null,
    adjustBy: 0,
    newNumberOfPacks: 0, // populated once direction is selected (thoughts?)
  });

  const { mutateAsync: createMutation } = useCreate(stockLine.id);
  // could then also have update mutation here

  const create = useCallback(async () => {
    await createMutation(draft);
    setDraft({
      direction: null,
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
      if (!direction) return; // todo: error here?
      return sdk.createInventoryAdjustment({
        storeId,
        input: {
          direction,
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
