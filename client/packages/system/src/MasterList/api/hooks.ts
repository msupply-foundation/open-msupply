import {
  useQuery,
  useOmSupplyApi,
  useAuthContext,
  useQueryParams,
} from '@openmsupply-client/common';
import { MasterListRow } from './../types';
import { getSdk } from './operations.generated';
import { getMasterListQueries, ListParams } from './api';

export const useMasterListApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['master-list'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };
  const { client } = useOmSupplyApi();
  const sdk = getSdk(client);
  const queries = getMasterListQueries(sdk, storeId);

  return { ...queries, storeId, keys };
};

export const useMasterLists = () => {
  const queryParams = useQueryParams<MasterListRow>({
    initialSortBy: { key: 'name' },
  });
  const api = useMasterListApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list({
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
        filterBy: queryParams.filter.filterBy,
      })
    ),
    ...queryParams,
  };
};
