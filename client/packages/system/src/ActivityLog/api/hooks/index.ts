import { Document } from './document';
import { Utils } from './utils';

export const useActivityLog = {
  document: {
    listByRecord: Document.useLogsByRecord,
  },
  utils: {
    api: Utils.useLogApi,
  },
};
