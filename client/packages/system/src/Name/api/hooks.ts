import {
  useQueryParams,
  useOmSupplyApi,
  Name,
  useAuthContext,
  useQuery,
  UseQueryResult,
} from '@openmsupply-client/common';
import { getNameQueries } from './api';
import { getSdk } from './operations.generated';

const useNamesApi = () => {
  const { storeId } = useAuthContext();
  const { client } = useOmSupplyApi();
  const queries = getNameQueries(getSdk(client), storeId);
  return { ...queries, storeId };
};

export const useNamesSearch = ({
  isCustomer,
}: {
  isCustomer?: boolean;
}): UseQueryResult<{
  nodes: Name[];
  totalCount: number;
}> => {
  const api = useNamesApi();
  // TODO: Paginate and name/code filtering.
  return useQuery(['name', 'list', api.storeId, isCustomer], async () => {
    const result = await api.get.list({
      type: isCustomer ? 'customer' : 'supplier',
    });

    return result;
  });
};

export const useNames = (type: 'customer' | 'supplier') => {
  const api = useNamesApi();
  const queryParams = useQueryParams<Name>({
    initialSortBy: { key: 'name' },
  });
  return {
    ...useQuery(['name', 'list', api.storeId, queryParams], () =>
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
