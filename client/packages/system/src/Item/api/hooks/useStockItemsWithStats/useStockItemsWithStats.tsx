import { ItemNodeType, useQuery } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

export const useStockItemsWithStats = () => {
  const queryParams = {
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
    offset: 0,
    first: 5000, // TODO: remove arbitrary limit
    filterBy: { type: { equalTo: ItemNodeType.Stock } },
  };
  const api = useItemApi();
  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.stockItemsWithStats(queryParams)
  );
};
