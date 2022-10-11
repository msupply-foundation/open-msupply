import { Document } from './document';
import { Utils } from './utils';

export const useLog = {
  document: {
    listByRecord: Document.useLogsByRecord,
  },
  utils: {
    api: Utils.useLogApi,
  },
};
