import { useGql, useQueryClient } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useReturnReasonGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const returnReasonApi = getSdk(client);

  return { returnReasonApi, queryClient };
};
