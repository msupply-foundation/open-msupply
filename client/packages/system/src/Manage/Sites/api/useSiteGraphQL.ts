import { useGql, useQueryClient } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useSiteGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const siteApi = getSdk(client);

  return { siteApi, queryClient };
};
