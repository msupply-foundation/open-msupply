import { Document } from './document';
import { Utils } from './utils';

export const useReturnReason = {
  document: {
    listAllActive: Document.useReturnReasons,
  },
  utils: {
    api: Utils.useReturnReasonApi,
  },
};
