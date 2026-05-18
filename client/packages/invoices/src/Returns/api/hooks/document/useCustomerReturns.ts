import { useQuery } from '@openmsupply-client/common';
import { CustomerListParams } from '../../api';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useCustomerReturns = (queryParams: CustomerListParams) => {
  const api = useReturnsApi();

  return {
    ...useQuery({
      queryKey: api.keys.customerParamList(queryParams),

      queryFn: () =>
        api.get.listCustomer(queryParams)
    }),
  };
};
