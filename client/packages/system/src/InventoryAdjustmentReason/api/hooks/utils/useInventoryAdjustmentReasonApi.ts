import { useGql, SortBy } from '@openmsupply-client/common';
import { getInventoryAdjustmentReasonsQuery } from '../../api';
import { getSdk, InventoryAdjustmentReasonRowFragment } from '../../operations.generated';

export const useInventoryAdjustmentReasonApi = () => {
  const keys = {
    base: () => ['inventoryAdjustmentReason'] as const,
    list: () => [...keys.base(), 'list'] as const,
    sortedList: (sortBy?: SortBy<InventoryAdjustmentReasonRowFragment>) =>
      [...keys.list(), sortBy] as const,
    sortedListActive: (isActive: boolean, sortBy?: SortBy<InventoryAdjustmentReasonRowFragment>) =>
      [...keys.sortedList(sortBy), isActive] as const,
  };
  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getInventoryAdjustmentReasonsQuery(sdk);
  return { ...queries, keys };
};
