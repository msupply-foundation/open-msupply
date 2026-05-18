import { useQuery, keepPreviousData, useUrlQueryParams } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useStores = () => {
  const api = useNameApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filters: [{ key: 'codeOrName' }],
  });

  return useQuery({
    queryKey: api.keys.storesList(queryParams),
    queryFn: () => api.get.stores(queryParams),
    placeholderData: keepPreviousData
  });
};
