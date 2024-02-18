import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useReturns = {
  document: {
    insertSupplierReturn: Document.useInsertSupplierReturn,
  },
  lines: {
    newReturnLines: Lines.useNewSupplierReturnLines,
  },
  utils: {
    api: Utils.useReturnsApi,
  },
};
