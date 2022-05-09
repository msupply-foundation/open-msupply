import { useAuthContext, useQuery } from '@openmsupply-client/common';
import { useDashboardApi } from './../utils/useDashboardApi';

export const useStockCounts = () => {
  const api = useDashboardApi();
  const { storeId } = useAuthContext();
  return useQuery(['dashboard', 'stock-counts', storeId], () =>
    api.get.stockCounts()
  );
};
