import { useQuery } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

export const useItemStockOnHand = () => {
  const queryParams = {
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
    offset: 0,
    first: 5000, // TODO: remove arbitrary limit
  };
  const api = useItemApi();
  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.itemStockOnHand(queryParams)
  );
};
