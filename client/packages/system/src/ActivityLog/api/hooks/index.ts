import { Document } from './document';
import { Utils } from './utils';

export const useActivityLog = {
  document: {
    listByRecord: Document.useActivityLogsByRecord,
  },
  utils: {
    api: Utils.useActivityLogApi,
  },
};
