import { Document } from './document';
import { Utils } from './utils';

export const useStock = {
  document: {
    get: Document.useStockLine,
    list: Document.useStockLines,
  },
  utils: {
    api: Utils.useStockApi,
  },
};
