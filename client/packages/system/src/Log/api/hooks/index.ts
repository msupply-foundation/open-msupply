import { Utils } from './utils';
import { Document } from './document';
export * from './useLog';

export const useLogOld = {
  document: {
    logContentsByFileName: Document.useLogContentsByFileName,
  },
  utils: {
    api: Utils.useLogApi,
  },
};
