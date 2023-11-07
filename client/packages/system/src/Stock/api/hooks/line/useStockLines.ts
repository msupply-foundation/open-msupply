import { useQuery } from '@openmsupply-client/common';
import { ListParams, useStockApi } from '../utils/useStockApi';

export const useStockLines = (queryParams: ListParams) => {
  const api = useStockApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
  };
};
