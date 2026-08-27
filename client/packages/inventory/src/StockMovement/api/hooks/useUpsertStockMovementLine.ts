import {
  UpsertStockRelocationLineInput,
  useMutation,
} from '@openmsupply-client/common';
import { STOCK_MOVEMENT, STOCK_MOVEMENT_DRAFT_LINES } from './keys';
import { useStockMovementGraphQL } from '../useStockMovementGraphQL';

export const useUpsertStockMovementLine = () => {
  const { stockMovementApi, storeId, queryClient } = useStockMovementGraphQL();

  const mutationFn = async (input: UpsertStockRelocationLineInput) => {
    const result = await stockMovementApi.batchStockRelocationLine({
      storeId,
      input: { upsert: [input] },
    });
    return result.batchStockRelocationLine.upsert?.[0]?.response;
  };

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STOCK_MOVEMENT] });
      queryClient.invalidateQueries({
        queryKey: [STOCK_MOVEMENT_DRAFT_LINES],
      });
    },
  });

  return { upsert: mutateAsync, isUpserting: isPending, error };
};
