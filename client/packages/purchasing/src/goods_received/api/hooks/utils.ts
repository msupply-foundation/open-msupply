import {
  GoodsReceivedNodeStatus,
  GoodsReceivedNodeType,
  RecordPatch,
} from '@common/types';
import { FnUtils, setNullableInput } from '@common/utils';
import { ItemStockOnHandFragment } from '@openmsupply-client/system/src';
import { GoodsReceivedFragment } from '../operations.generated';
import { DraftGoodsReceivedLine } from './useGoodsReceivedLine';

export const mapStatus = (
  status?: GoodsReceivedNodeStatus
): GoodsReceivedNodeType | undefined => {
  switch (status) {
    case GoodsReceivedNodeStatus.New:
      return GoodsReceivedNodeType.New;
    case GoodsReceivedNodeStatus.Finalised:
      return GoodsReceivedNodeType.Finalised;
    default:
      return undefined;
  }
};

export const parseUpdateInput = (input: RecordPatch<GoodsReceivedFragment>) => {
  return {
    id: input.id,
    status: mapStatus(input.status),
    receivedDate: setNullableInput('receivedDatetime', input),
    comment: input.comment,
  };
};

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
    manufacturerLinkId: null,
    numberOfPacksReceived: 0,
    receivedPackSize: 0,
    itemId: item.id,
  };
};
