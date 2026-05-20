import { useGql, useQueryClient } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const usePropertyGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const propertyApi = getSdk(client);

  return { propertyApi, queryClient };
};
