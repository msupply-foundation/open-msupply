import { SortBy, useQuery } from '@openmsupply-client/common';
import { InventoryAdjustmentReasonRowFragment } from '../../operations.generated';
import { useInventoryAdjustmentReasonApi } from '../utils/useInventoryAdjustmentReasonApi';

export const useInventoryAdjustmentReason = (
  sortBy?: SortBy<InventoryAdjustmentReasonRowFragment>
) => {
  const api = useInventoryAdjustmentReasonApi();
  const result = useQuery(
    api.keys.sortedList(sortBy),
    () => api.get.listAllActive({ sortBy }),
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  return { ...result };
};
