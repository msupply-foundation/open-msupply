import { useGql, useQueryClient } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useReasonOptionsGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const reasonOptionsApi = getSdk(client);

  return { reasonOptionsApi, queryClient };
};
