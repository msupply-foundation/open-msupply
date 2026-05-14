import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useCustomers = () => {
  const api = useNameApi();

  return useQuery({
    queryKey: [...api.keys.list(), 'customers'],

    queryFn: () =>
      api.get.customers({
        first: 1000,
      })
  });
};
