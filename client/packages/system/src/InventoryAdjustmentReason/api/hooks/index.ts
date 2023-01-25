import { Document } from './document';
import { Utils } from './utils';

export const useInventoryAdjustmentReason = {
  document: {
    listAllActive: Document.useInventoryAdjustmentReason
  },
  utils: {
    api: Utils.useInventoryAdjustmentReasonApi,
  },
};
