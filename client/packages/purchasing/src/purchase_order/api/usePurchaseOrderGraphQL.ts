import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const usePurchaseOrderGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId } = useAuthContext();
  const purchaseOrderApi = getSdk(client);

  return { purchaseOrderApi, queryClient, storeId };
};
