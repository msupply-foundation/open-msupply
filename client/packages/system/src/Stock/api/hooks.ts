import {
  useAuthContext,
  useGql,
  useQuery,
  useQueryParamsStore,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';
import { getStockQueries } from './api';

export const useStockApi = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getStockQueries(getSdk(client), storeId);
  return { ...queries, storeId };
};

export const useStockLines = () => {
  const api = useStockApi();
  const queryParams = useQueryParamsStore();
  return {
    ...useQuery(['stock', 'list', api.storeId, queryParams.paramList()], () =>
      api.get.list(queryParams.paramList())
    ),
    ...queryParams,
  };
};
