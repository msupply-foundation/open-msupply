import { useQuery } from '@openmsupply-client/common';
import { useDashboardApi } from './../utils/useDashboardApi';

export const useStockCounts = () => {
  const api = useDashboardApi();

  return useQuery(api.keys.stock(), api.get.stockCounts, {
    retry: false,
    onError: () => {},
  });
};
