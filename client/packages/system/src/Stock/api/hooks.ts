import {
  useAuthContext,
  useGraphQLClient,
  useQuery,
  useQueryParams,
} from '@openmsupply-client/common';
import { StockRow } from './../types';
import { getSdk } from './operations.generated';
import { getStockQueries } from './api';

export const useStockApi = () => {
  const { client } = useGraphQLClient();
  const { storeId } = useAuthContext();
  const queries = getStockQueries(getSdk(client), storeId);
  return { ...queries, storeId };
};

export const useStockLines = () => {
  const api = useStockApi();
  const queryParams = useQueryParams<StockRow>({
    initialSortBy: { key: 'itemName' },
  });
  return {
    ...useQuery(['stock', 'list', api.storeId, queryParams], () =>
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
