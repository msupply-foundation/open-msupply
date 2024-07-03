import { useQuery } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

type UseItemStockOnHandParams = {
  pagination: { first: number; offset: number };
  filter: { [key: string]: { like: string } };
  preload?: boolean;
};

export const useItemStockOnHand = ({
  pagination,
  filter,
}: UseItemStockOnHandParams) => {
  const queryParams = {
    ...pagination,
    filterBy: filter,
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
  };

  const api = useItemApi();

  return useQuery(
    api.keys.paramList(queryParams),
    () => api.get.itemStockOnHand(queryParams),
    { refetchOnWindowFocus: false, cacheTime: 0 }
  );
};
