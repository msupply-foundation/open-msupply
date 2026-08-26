import { useMutation } from '@openmsupply-client/common';
import { STOCK_MOVEMENT } from './keys';
import { useStockMovementGraphQL } from '../useStockMovementGraphQL';

export const useDeleteStockMovement = () => {
  const { stockMovementApi, storeId, queryClient } = useStockMovementGraphQL();

  const mutationFn = async (id: string) => {
    const result = await stockMovementApi.deleteStockRelocation({
      storeId,
      input: { id },
    });
    return result.deleteStockRelocation;
  };

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [STOCK_MOVEMENT] }),
  });

  return { delete: mutateAsync, isDeleting: isPending, error };
};

export const useDeleteStockMovements = () => {
  const { stockMovementApi, storeId, queryClient } = useStockMovementGraphQL();

  const mutationFn = async (ids: string[]) => {
    await stockMovementApi.deleteStockRelocations({ storeId, ids });
  };

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [STOCK_MOVEMENT] }),
  });

  return { deleteStockMovements: mutateAsync, isDeleting: isPending, error };
};
