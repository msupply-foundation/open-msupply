import { useQuery, useQueryParams } from '@openmsupply-client/common';
import { useItemApi } from './../useItemApi';

export const useStockItems = () => {
  const api = useItemApi();
  const queryParams = useQueryParams({ initialSortBy: { key: 'name' } });

  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.stockItems(queryParams)
  );
};
