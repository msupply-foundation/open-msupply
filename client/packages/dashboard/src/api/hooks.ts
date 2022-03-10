import { useAuthContext, useGql, useQuery } from '@openmsupply-client/common';
import { DashboardApi, getDashboardQueries } from './api';
import { getSdk } from './operations.generated';

export const useDashboardApi = (): DashboardApi => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getDashboardQueries(getSdk(client), storeId);
  return { ...queries, storeId: storeId };
};

export const useStockCounts = () => {
  const api = useDashboardApi();
  const { storeId } = useAuthContext();
  return useQuery(['dashboard', 'stock-counts', storeId], () =>
    api.get.stockCounts()
  );
};

export const useItemStats = () => {
  const api = useDashboardApi();
  const { storeId } = useAuthContext();
  return useQuery(['dashboard', 'item-stats', storeId], () =>
    api.get.itemStats()
  );
};
