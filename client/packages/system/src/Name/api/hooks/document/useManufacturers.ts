import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useManufacturers = () => {
  const api = useNameApi();
  const queryParams = useQueryParamsStore();
  const params = queryParams?.paramList ? queryParams.paramList() : {};

  return useQuery({
    queryKey: api.keys.paramList(params),

    queryFn: () =>
      api.get.manufacturers(params)
  });
};
