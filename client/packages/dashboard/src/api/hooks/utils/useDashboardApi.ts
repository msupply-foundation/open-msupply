import { useAuthContext, useGql } from '@openmsupply-client/common';
import { DashboardApi, getDashboardQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useDashboardApi = (): DashboardApi => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getDashboardQueries(getSdk(client), storeId);
  return { ...queries, storeId: storeId };
};
