import { GoodsReceivedNodeStatus } from '@common/types';
import { GoodsReceivedFragment } from './api/operations.generated';

export const canDeleteGoodsReceived = (row: GoodsReceivedFragment): boolean =>
  row.status === GoodsReceivedNodeStatus.New;
