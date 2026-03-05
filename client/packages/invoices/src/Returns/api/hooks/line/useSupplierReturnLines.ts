import { useQuery } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useSupplierReturnLines = (
  stockLineIds: string[],
  itemId?: string,
  returnId?: string
) => {
  const api = useReturnsApi();

  const { data } = useQuery({
    queryKey: api.keys.generatedSupplierLines(itemId),

    queryFn: () =>
      api.get.supplierReturnLines(stockLineIds, itemId, returnId)
  });

  return data;
};
