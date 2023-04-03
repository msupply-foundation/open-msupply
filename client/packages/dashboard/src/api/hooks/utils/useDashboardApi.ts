import { useAuthContext, useGql } from '@openmsupply-client/common';
import { getDashboardQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useDashboardApi = () => {
  const keys = {
    base: () => ['dashboard'] as const,
    count: () => [...keys.base(), 'count', storeId] as const,
    items: () => [...keys.count(), 'items'] as const,
    stock: () => [...keys.count(), 'stock'] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getDashboardQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
