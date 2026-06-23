import { useGql, useQueryClient } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const usePropertiesGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const api = getSdk(client);

  return { api, queryClient };
};
