import { Document } from './document';
import { Utils } from './utils';

export const reasonOptions = {
  document: {
    listAllActive: Document.useReasonOptions,
  },
  utils: {
    api: Utils.useReasonOptionsApi,
  },
};
