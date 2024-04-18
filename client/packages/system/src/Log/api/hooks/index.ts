import { Utils } from './utils';
import { Document } from './document';

export const useLog = {
  document: {
    listFileNames: Document.useLogFileNames,
    logContentsByFileName: Document.useLogContentsByFileName,
  },
  utils: {
    api: Utils.useLogApi,
  },
};
