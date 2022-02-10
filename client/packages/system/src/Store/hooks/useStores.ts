import {
  UseQueryResult,
  Store,
  StoresQuery,
  useOmSupplyApi,
  useQueryParams,
  useQuery,
} from '@openmsupply-client/common';

const storesGuard = (
  storesQuery: StoresQuery
): { totalCount: number; nodes: Store[] } => {
  if (storesQuery.stores.__typename === 'StoreConnector') {
    return storesQuery.stores;
  } else {
    throw new Error('stores query is not valid');
  }
};

export const useStores = (): UseQueryResult<{
  nodes: Store[];
  totalCount: number;
}> => {
  const { api } = useOmSupplyApi();
  const initialListParameters = { initialSortBy: { key: 'code' } };
  const { filterBy, queryParams, first, offset } = useQueryParams(
    initialListParameters
  );

  return useQuery(
    ['stores', 'list', queryParams],
    async () => {
      const result = await api.stores({
        filter: filterBy,
        first,
        offset,
      });

      return storesGuard(result);
    },
    {
      keepPreviousData: true,
    }
  );
};
