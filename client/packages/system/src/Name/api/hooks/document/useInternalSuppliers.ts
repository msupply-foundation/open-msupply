import { useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useInternalSuppliers = () => {
  const api = useNameApi();

  return useQuery([...api.keys.list(), 'internalSuppliers'], () =>
    api.get.internalSuppliers()
  );
};
