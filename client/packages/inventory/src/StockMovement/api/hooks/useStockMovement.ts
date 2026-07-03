import { useQuery } from '@openmsupply-client/common';
import { stockMovementKeys } from './keys';
import { useStockMovementGraphQL } from '../useStockMovementGraphQL';
import { StockMovementFragment } from '../operations.generated';

export const useStockMovement = (id: string) => {
  const { stockMovementApi, storeId } = useStockMovementGraphQL();

  const queryFn = async (): Promise<StockMovementFragment | undefined> => {
    const result = await stockMovementApi.stockRelocation({ storeId, id });
    if (result.stockRelocation.__typename === 'StockRelocationNode') {
      return result.stockRelocation;
    }
    return undefined;
  };

  return useQuery({
    queryKey: stockMovementKeys.detail(id),
    queryFn,
    enabled: !!id,
  });
};
