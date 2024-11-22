import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useStoreApi } from '../utils/useStoreApi';

export const useStores = (first?: number, offset?: number) => {
  const queryParams = useQueryParamsStore();
  const { filter } = queryParams;
  const { filterBy } = filter;

  const params = {
    first: first ?? 100,
    offset: offset ?? 0,
    filterBy,
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
  };

  const api = useStoreApi();

  return useQuery(
    api.keys.paramList(params),
    async () => api.get.list(params),
    { refetchOnWindowFocus: false, cacheTime: 0 }
  );
};
