import { FnUtils, useMutation } from '@openmsupply-client/common';
import { STOCK_MOVEMENT } from './keys';
import { useStockMovementGraphQL } from '../useStockMovementGraphQL';

export const useInsertStockMovement = () => {
  const { stockMovementApi, storeId, queryClient } = useStockMovementGraphQL();

  const mutationFn = async (comment?: string) => {
    const id = FnUtils.generateUUID();
    const result = await stockMovementApi.insertStockRelocation({
      storeId,
      input: { id, comment },
    });
    return result.insertStockRelocation.id;
  };

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [STOCK_MOVEMENT] }),
  });

  return { insert: mutateAsync, isSaving: isPending, error };
};
