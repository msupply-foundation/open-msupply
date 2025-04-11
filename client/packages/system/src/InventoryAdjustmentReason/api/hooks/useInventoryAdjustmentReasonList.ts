import { useQuery, LIST_KEY } from '@openmsupply-client/common';
import { useInventoryAdjustmentReasonGraphQL } from '../useInventoryAdjustmentReasonGraphQL';
import { INVENTORY_ADJUSTMENT_REASON } from './keys';
import { InventoryAdjustmentReasonRowFragment } from '../operations.generated';

export function useInventoryAdjustmentReasonList() {
  const { inventoryAdjustmentReasonApi } =
    useInventoryAdjustmentReasonGraphQL();

  const queryKey = [INVENTORY_ADJUSTMENT_REASON, LIST_KEY];
  const queryFn = async (): Promise<{
    nodes: InventoryAdjustmentReasonRowFragment[];
    totalCount: number;
  }> => {
    const query = await inventoryAdjustmentReasonApi.inventoryAdjustmentReasons(
      {
        filter: { isActive: true },
      }
    );
    const { nodes, totalCount } = query?.inventoryAdjustmentReasons;
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
}
