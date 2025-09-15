import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useSuppliers = (external?: boolean) => {
  const api = useNameApi();
  const queryParams = useQueryParamsStore();

  return useQuery(api.keys.paramList(queryParams.paramList()), () =>
    api.get.suppliers({
      ...queryParams.paramList(),
      external,
    })
  );
};
