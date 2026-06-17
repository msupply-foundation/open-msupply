import {
  UpdateStockRelocationInput,
  useMutation,
} from '@openmsupply-client/common';
import { STOCK_MOVEMENT } from './keys';
import { useStockMovementGraphQL } from '../useStockMovementGraphQL';

export const useUpdateStockMovement = () => {
  const { stockMovementApi, storeId, queryClient } = useStockMovementGraphQL();

  const mutationFn = async (input: UpdateStockRelocationInput) => {
    const result = await stockMovementApi.updateStockRelocation({
      storeId,
      input,
    });
    const response = result.updateStockRelocation;
    if (response.__typename === 'UpdateStockRelocationError') {
      throw new Error(response.error.description);
    }
    return response;
  };

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [STOCK_MOVEMENT] }),
  });

  return { update: mutateAsync, isUpdating: isPending, error };
};
