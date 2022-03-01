import {
  useQuery,
  useOmSupplyApi,
  useAuthContext,
  useQueryParams,
} from '@openmsupply-client/common';
import { MasterListRow } from './../types';
import { getSdk } from './operations.generated';
import { getMasterListQueries } from './api';

export const useMasterListApi = () => {
  const { client } = useOmSupplyApi();
  const { storeId } = useAuthContext();
  const sdk = getSdk(client);
  const queries = getMasterListQueries(sdk, storeId);

  return { ...queries, storeId };
};

export const useMasterLists = () => {
  const queryParams = useQueryParams<MasterListRow>({
    initialSortBy: { key: 'name' },
  });
  const api = useMasterListApi();

  return {
    ...useQuery(['master-list', 'list', api.storeId, queryParams], () =>
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
