import { useAuthContext, useQuery } from '@openmsupply-client/common';
import { useDashboardApi } from './../utils/useDashboardApi';

export const useItemCounts = (lowStockThreshold: number) => {
  const api = useDashboardApi();
  const { storeId } = useAuthContext();
  return useQuery(['dashboard', 'item-counts', storeId], () =>
    api.get.itemCounts(lowStockThreshold)
  );
};
