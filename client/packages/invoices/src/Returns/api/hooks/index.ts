import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useReturns = {
  document: {
    insertSupplierReturn: Document.useInsertSupplierReturn,
  },
  lines: {
    supplierReturnLines: Lines.useNewSupplierReturnLines,
    inboundReturnLines: Lines.useInboundReturnLines,
  },
  utils: {
    api: Utils.useReturnsApi,
  },
};
