import { useQuery } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

type UseItemStockOnHandParams = {
  pagination: { first: number; offset: number };
  filter: Record<string, { like: string } | string>;
  preload?: boolean;
  includeNonVisibleWithStockOnHand?: boolean;
};

export const useItemStockOnHand = ({
  pagination,
  filter,
  includeNonVisibleWithStockOnHand,
}: UseItemStockOnHandParams) => {
  const queryParams = {
    ...pagination,
    filterBy: filter,
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
    includeNonVisibleWithStockOnHand,
  };

  const api = useItemApi();

  return useQuery(
    api.keys.paramList(queryParams),
    () => api.get.itemStockOnHand(queryParams),
    { refetchOnWindowFocus: false, cacheTime: 0 }
  );
};
