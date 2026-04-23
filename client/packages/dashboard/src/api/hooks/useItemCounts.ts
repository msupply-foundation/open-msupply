import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, ITEMS } from './keys';
import { useApi } from './useApi';

export const useItemCounts = (lowStockThreshold: number, highStockThreshold: number) => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery(
    [DASHBOARD, ITEMS, storeId],
    () =>
      api.itemCounts({
        storeId,
        lowStockThreshold,
        highStockThreshold,
      }),
    {
      enabled: !!storeId,
      retry: false,
    }
  );

  if (!data?.itemCounts) {
    return { stats: undefined, ...rest };
  }

  const stats = data.itemCounts.itemCounts;

  return { stats, ...rest };
};
