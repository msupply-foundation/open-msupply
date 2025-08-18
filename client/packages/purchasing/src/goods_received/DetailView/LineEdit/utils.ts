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
    item: {
      __typename: 'ItemNode',
      id: item.id,
      name: item.name,
    },
    batch: '',
    comment: '',
    lineNumber: 0,
    expiryDate: null,
    manufacturerLinkId: '',
    numberOfPacksReceived: 0,
    receivedPackSize: 0,
    itemId: item.id,
  };
};
