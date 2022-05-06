import {
  useGql,
  useQueryParamsStore,
  useQuery,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';
import { getStoreQueries, ListParams } from './api';

const useStoreApi = () => {
  const keys = {
    base: () => ['store'] as const,
    detail: (id: string) => [...keys.base(), id] as const,
    list: () => [...keys.base(), 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };

  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getStoreQueries(sdk);
  return { ...queries, keys };
};

export const useStores = () => {
  const api = useStoreApi();
  const queryParams = useQueryParamsStore();
  const { filter, pagination } = queryParams;
  const { filterBy } = filter;
  const { first, offset } = pagination;

  return useQuery(api.keys.paramList(queryParams.paramList()), async () =>
    api.get.list({ filterBy, first, offset })
  );
};
