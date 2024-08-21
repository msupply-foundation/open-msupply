import { useQuery } from '@openmsupply-client/common';
import { SupplierListParams } from '../../api';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useSupplierReturns = (queryParams: SupplierListParams) => {
  const api = useReturnsApi();

  return {
    ...useQuery(api.keys.supplierParamList(queryParams), () =>
      api.get.listSupplier(queryParams)
    ),
  };
};
