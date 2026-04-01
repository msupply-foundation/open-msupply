import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, ITEMS } from './keys';
import { useApi } from './useApi';

export const useItemCounts = (lowStockThreshold: number, highStockThreshold: number) => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery({
    queryKey: [DASHBOARD, ITEMS, storeId],

    queryFn: () =>
      api.itemCounts({
        storeId,
        lowStockThreshold,
        highStockThreshold,
      }),

    retry: false
  });

  if (!data?.itemCounts) {
    return { stats: undefined, ...rest };
  }

  const stats = data.itemCounts.itemCounts;

  return { stats, ...rest };
};
