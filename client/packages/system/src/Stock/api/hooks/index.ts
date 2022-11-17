import { Document } from './document';
import { Utils } from './utils';

export const useStock = {
  document: {
    get: Document.useStockLine,
    list: Document.useStockLines,
    update: Document.useStockLineUpdate,
  },
  utils: {
    api: Utils.useStockApi,
  },
};
