import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useInternalSuppliers = () => {
  const api = useNameApi();

  return useQuery({
    queryKey: [...api.keys.list(), 'internalSuppliers'],

    queryFn: () =>
      api.get.internalSuppliers()
  });
};
