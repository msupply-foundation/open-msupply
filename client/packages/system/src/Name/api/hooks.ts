import {
  useQueryParams,
  useOmSupplyApi,
  useAuthContext,
  useQuery,
} from '@openmsupply-client/common';
import { getNameQueries, ListParams } from './api';
import { getSdk, NameRowFragment } from './operations.generated';

const useNamesApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['name'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };
  const { client } = useOmSupplyApi();
  const queries = getNameQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};

export const useNamesSearch = ({ isCustomer }: { isCustomer?: boolean }) => {
  const api = useNamesApi();
  return useQuery(api.keys.list(), async () => {
    const result = await api.get.list({
      type: isCustomer ? 'customer' : 'supplier',
    });

    return result;
  });
};

export const useNames = (type: 'customer' | 'supplier') => {
  const api = useNamesApi();
  const queryParams = useQueryParams<NameRowFragment>({
    initialSortBy: { key: 'name' },
  });
  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list({
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
        type: type === 'customer' ? 'customer' : 'supplier',
      })
    ),
    ...queryParams,
  };
};
