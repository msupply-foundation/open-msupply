import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useStockApi } from '../utils/useStockApi';

export const useStockLines = () => {
  const api = useStockApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'expiryDate', dir: 'desc' },
  });
  return {
    ...useQuery(['stock', 'list', api.storeId, queryParams], () =>
      api.get.list(queryParams)
    ),
  };
};
