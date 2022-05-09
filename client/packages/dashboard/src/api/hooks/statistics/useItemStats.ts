import { useAuthContext, useQuery } from '@openmsupply-client/common';
import { useDashboardApi } from './../utils/useDashboardApi';

export const useItemStats = () => {
  const api = useDashboardApi();
  const { storeId } = useAuthContext();
  return useQuery(['dashboard', 'item-stats', storeId], () =>
    api.get.itemStats()
  );
};
