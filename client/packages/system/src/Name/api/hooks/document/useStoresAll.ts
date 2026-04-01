import { NumUtils, useQuery } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useStoresAll = () => {
  const api = useNameApi();

  const queryParams = {
    first: NumUtils.MAX_SAFE_API_INTEGER,
  };

  return useQuery({
    queryKey: api.keys.paramList(queryParams),

    queryFn: () =>
      api.get.stores(queryParams)
  });
};
