import {
  useOmSupplyApi,
  useQueryParams,
  useQuery,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';
import { getStoreQueries } from './api';

const useStoreApi = () => {
  const { client } = useOmSupplyApi();
  const sdk = getSdk(client);
  const queries = getStoreQueries(sdk);
  return queries;
};

export const useStores = () => {
  const api = useStoreApi();
  const initialListParameters = { initialSortBy: { key: 'code' } };
  const { filterBy, queryParams, first, offset } = useQueryParams(
    initialListParameters
  );

  return useQuery(['stores', 'list', queryParams], async () =>
    api.get.list({
      filter: filterBy,
      first,
      offset,
    })
  );
};
