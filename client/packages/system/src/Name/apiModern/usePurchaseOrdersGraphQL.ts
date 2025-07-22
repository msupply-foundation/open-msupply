import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const usePurchaseOrdersGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId } = useAuthContext();
  const purchaseOrdersApi = getSdk(client);

  return { purchaseOrdersApi, queryClient, storeId };
};
