import { ItemStockOnHandFragment } from '@openmsupply-client/system/src';
import { FnUtils } from '@common/utils';
import { DraftGoodsReceivedLine } from '../../api/hooks/useGoodsReceivedLine';

export const createDraftGoodsReceivedLine = (
  item: ItemStockOnHandFragment,
  goodsReceivedId: string,
  purchaseOrderLineId: string
): DraftGoodsReceivedLine => {
  return {
    id: FnUtils.generateUUID(),
    goodsReceivedId,
    purchaseOrderLineId,
    itemId: item.id,
  };
};
