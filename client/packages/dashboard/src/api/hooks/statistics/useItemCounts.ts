import { useQuery } from '@openmsupply-client/common';
import { useDashboardApi } from './../utils/useDashboardApi';

export const useItemCounts = (lowStockThreshold: number) => {
  const api = useDashboardApi();
  return useQuery(
    api.keys.items(),
    () => api.get.itemCounts(lowStockThreshold),
    { retry: false, onError: () => {} }
  );
};
