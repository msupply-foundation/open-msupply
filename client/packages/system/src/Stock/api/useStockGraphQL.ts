import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

// TODO: generic useGraphql with all except stock API
export const useStockGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId } = useAuthContext();
  const stockApi = getSdk(client);

  return { stockApi, queryClient, storeId };
};
