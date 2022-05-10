import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useStockApi } from '../utils/useStockApi';

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
