import {
  GoodsReceivedNodeStatus,
  GoodsReceivedNodeType,
  RecordPatch,
} from '@common/types';
import { GoodsReceivedFragment } from '../operations.generated';
import { setNullableInput } from '@common/utils';

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
