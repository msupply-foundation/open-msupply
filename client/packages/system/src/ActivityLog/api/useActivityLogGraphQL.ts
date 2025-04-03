import { useGql, useQueryClient } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useActivityLogGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const activityLogApi = getSdk(client);

  return { activityLogApi, queryClient };
};
