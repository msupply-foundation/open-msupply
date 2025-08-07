import { ItemWithStatsFragment } from '@openmsupply-client/system';
import { DraftPurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import { FnUtils } from '@common/utils';

export const createDraftPurchaseOrderLine = (
  item: ItemWithStatsFragment,
  purchaseOrderId: string
): DraftPurchaseOrderLine => {
  return {
    id: FnUtils.generateUUID(),
    purchaseOrderId,
    itemId: item.id,
    requestedPackSize: 0,
    requestedNumberOfUnits: 0,
  };
};
