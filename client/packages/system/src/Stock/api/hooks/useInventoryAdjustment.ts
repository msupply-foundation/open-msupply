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
  const [draft, setDraft] = useState<DraftInventoryAdjustment>({
    direction: Adjustment.None,
    reason: null,
    adjustBy: 0,
    newNumberOfPacks: 0, // populated once direction is selected (thoughts?)
  });

  const { mutateAsync } = useCreate(stockLine.id);
  const create = useCallback(async () => {
    await mutateAsync(draft);
    setDraft({
      direction: Adjustment.None,
      reason: null,
      adjustBy: 0,
      newNumberOfPacks: 0,
    });
  }, [draft, mutateAsync]);

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
    ({ direction, newNumberOfPacks, reason }: DraftInventoryAdjustment) =>
      sdk.createInventoryAdjustment({
        storeId,
        input: {
          direction: direction.toString(), // todo
          newNumberOfPacks,
          reasonId: reason?.id ?? '', // todo
          stockLineId,
        },
      }),
    {
      onSuccess: () =>
        // Stock line needs to be re-fetched to load quantity
        queryClient.invalidateQueries(['stock', storeId, stockLineId]), // TODO
    }
  );
};
