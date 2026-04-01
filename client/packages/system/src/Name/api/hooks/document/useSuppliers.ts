import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useSuppliers = (external?: boolean) => {
  const api = useNameApi();
  const queryParams = useQueryParamsStore();

  const params = queryParams?.paramList ? queryParams.paramList() : {};
  return useQuery({
    queryKey: api.keys.paramList(params),

    queryFn: () =>
      api.get.suppliers({
        ...params,
        external,
      })
  });
};
