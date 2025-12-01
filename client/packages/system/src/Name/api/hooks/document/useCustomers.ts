import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useCustomers = () => {
  const api = useNameApi();

  return useQuery([...api.keys.list(), 'customers'], () =>
    api.get.customers({})
  );
};
