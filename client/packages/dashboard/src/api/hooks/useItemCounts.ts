import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, ITEMS } from './keys';
import { useApi } from './useApi';

export const useItemCounts = (lowStockThreshold: number) => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery(
    [DASHBOARD, ITEMS, storeId],
    () =>
      api.itemCounts({
        storeId,
        lowStockThreshold,
      }),
    {
      retry: false,
    }
  );

  if (!data) {
    return { stats: undefined, ...rest };
  }

  const stats = data.itemCounts.itemCounts;

  return { stats, ...rest };
};
