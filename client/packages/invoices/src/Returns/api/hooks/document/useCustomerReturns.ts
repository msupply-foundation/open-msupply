import { useQuery } from '@openmsupply-client/common';
import { CustomerListParams } from '../../api';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useCustomerReturns = (queryParams: CustomerListParams) => {
  const api = useReturnsApi();

  return {
    ...useQuery(api.keys.customerParamList(queryParams), () =>
      api.get.listCustomer(queryParams)
    ),
  };
};
