import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useStockApi } from '../utils/useStockApi';

export const useStockLines = () => {
  const api = useStockApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'expiryDate', dir: 'desc' },
    filterKey: 'itemCodeOrName',
  });
  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
  };
};
