import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useStores = () => {
  const api = useNameApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filters: [{ key: 'codeOrName' }],
  });

  return useQuery(
    api.keys.storesList(queryParams),
    () => api.get.stores(queryParams),
    {
      keepPreviousData: true,
    }
  );
};
