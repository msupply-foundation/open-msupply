import { Document } from './document';
import { Utils } from './utils';

export const useStock = {
  document: {
    list: Document.useStockLines,
  },
  utils: {
    api: Utils.useStockApi,
  },
};
