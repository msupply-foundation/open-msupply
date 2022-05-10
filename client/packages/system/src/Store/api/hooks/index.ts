import { Document } from './document';
import { Utils } from './utils';

export const useStore = {
  utils: {
    api: Utils.useStoreApi,
  },
  document: {
    list: Document.useStores,
  },
};
