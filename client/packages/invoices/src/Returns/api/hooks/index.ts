import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useReturns = {
  document: {
    insertSupplierReturn: Document.useInsertSupplierReturn,
  },
  lines: {
    supplierReturnLines: Lines.useNewSupplierReturnLines,
  },
  utils: {
    api: Utils.useReturnsApi,
  },
};
