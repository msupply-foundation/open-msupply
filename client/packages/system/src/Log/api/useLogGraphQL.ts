import { useGql, useQueryClient } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useLogGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const logApi = getSdk(client);

  return { logApi, queryClient };
};
