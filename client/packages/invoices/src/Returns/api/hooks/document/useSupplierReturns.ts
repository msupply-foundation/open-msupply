import { useQuery } from '@openmsupply-client/common';
import { SupplierListParams } from '../../api';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useSupplierReturns = (queryParams: SupplierListParams) => {
  const api = useReturnsApi();

  return {
    ...useQuery({
      queryKey: api.keys.supplierParamList(queryParams),

      queryFn: () =>
        api.get.listSupplier(queryParams)
    }),
  };
};
