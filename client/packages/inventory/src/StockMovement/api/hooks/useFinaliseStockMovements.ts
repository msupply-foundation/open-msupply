import {
  StockRelocationNodeStatus,
  useMutation,
} from '@openmsupply-client/common';
import { STOCK_MOVEMENT } from './keys';
import { useStockMovementGraphQL } from '../useStockMovementGraphQL';

export const useFinaliseStockMovements = () => {
  const { stockMovementApi, storeId, queryClient } = useStockMovementGraphQL();

  const mutationFn = async (ids: string[]) => {
    const result = await stockMovementApi.updateStockRelocations({
      storeId,
      input: ids.map(id => ({
        id,
        status: StockRelocationNodeStatus.Finalised,
      })),
    });
    return result.updateStockRelocations;
  };

  const { mutateAsync, isPending } = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [STOCK_MOVEMENT] }),
  });

  return { finalise: mutateAsync, isFinalising: isPending };
};
