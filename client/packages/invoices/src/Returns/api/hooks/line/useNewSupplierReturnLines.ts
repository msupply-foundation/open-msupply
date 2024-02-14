import { useQuery } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useNewSupplierReturnLines = (stockLineIds: string[]) => {
  const api = useReturnsApi();

  const { data } = useQuery(api.keys.newReturns(), () =>
    api.get.newSupplierReturnLines(stockLineIds)
  );

  return data;
};
