import { useMutation } from '@openmsupply-client/common';
import { STOCK_MOVEMENT, STOCK_MOVEMENT_DRAFT_LINES } from './keys';
import { useStockMovementGraphQL } from '../useStockMovementGraphQL';

export const useDeleteStockMovementLines = () => {
  const { stockMovementApi, storeId, queryClient } = useStockMovementGraphQL();

  const mutationFn = async (ids: string[]) => {
    const result = await stockMovementApi.batchStockRelocationLine({
      storeId,
      input: { delete: ids },
    });
    return result.batchStockRelocationLine.delete ?? [];
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

  return { deleteLines: mutateAsync, isDeleting: isPending, error };
};
