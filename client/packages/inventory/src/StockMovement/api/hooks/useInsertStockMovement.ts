import {
  FnUtils,
  InsertStockRelocationInput,
  useMutation,
} from '@openmsupply-client/common';
import { STOCK_MOVEMENT } from './keys';
import { useStockMovementGraphQL } from '../useStockMovementGraphQL';

export type DraftStockMovementLine = {
  fromStockLineId: string;
  fromNumberOfPacks: number;
  toLocationId?: string | null;
  toPackSize: number;
};

export type DraftStockMovement = {
  fromLocationId?: string | null;
  lines: DraftStockMovementLine[];
};

export const useInsertStockMovement = () => {
  const { stockMovementApi, storeId, queryClient } = useStockMovementGraphQL();

  const mutationFn = async (draft: DraftStockMovement) => {
    const input: InsertStockRelocationInput = {
      fromLocationId: draft.fromLocationId,
      lines: draft.lines.map(line => ({
        id: FnUtils.generateUUID(),
        fromStockLineId: line.fromStockLineId,
        fromNumberOfPacks: line.fromNumberOfPacks,
        toLocationId: line.toLocationId,
        toPackSize: line.toPackSize,
      })),
    };

    const result = await stockMovementApi.insertStockRelocation({
      storeId,
      input,
    });
    return result.insertStockRelocation;
  };

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [STOCK_MOVEMENT] }),
  });

  return { insert: mutateAsync, isSaving: isPending, error };
};
