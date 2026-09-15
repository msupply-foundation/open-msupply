import { useGql, useQueryClient } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useCustomFieldGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const customFieldApi = getSdk(client);

  return { customFieldApi, queryClient };
};
