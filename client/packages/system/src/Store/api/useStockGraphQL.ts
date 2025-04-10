import { useGql, useQueryClient } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useStoreGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const storeApi = getSdk(client);

  return { storeApi, queryClient };
};
