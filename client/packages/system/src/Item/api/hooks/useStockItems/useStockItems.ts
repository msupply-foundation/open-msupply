import { ItemNodeType, useQuery } from '@openmsupply-client/common';
import { useItemApi } from './../useItemApi';

export const useStockItems = () => {
  const api = useItemApi();
  const queryParams = {
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
    offset: 0,
    first: 200, // TODO: remove arbitrary limit
    filterBy: { type: { equalTo: ItemNodeType.Stock } },
  };

  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.stockItems(queryParams)
  );
};
