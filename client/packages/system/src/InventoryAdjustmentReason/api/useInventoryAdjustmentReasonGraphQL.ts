import { useGql, useQueryClient } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useInventoryAdjustmentReasonGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const inventoryAdjustmentReasonApi = getSdk(client);

  return { inventoryAdjustmentReasonApi, queryClient };
};
