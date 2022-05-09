import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useCustomers = () => {
  const api = useNameApi();
  const queryParams = useQueryParamsStore();

  return useQuery(api.keys.paramList(queryParams.paramList()), () =>
    api.get.customers(queryParams.paramList())
  );
};
