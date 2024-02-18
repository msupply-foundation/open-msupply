import { Lines } from './line';
import { Document } from './document';
import { Utils } from './utils';

export const useReturns = {
  document: {
    outboundReturn: Document.useOutboundReturn,
  },
  lines: {
    newReturnLines: Lines.useNewSupplierReturnLines,
  },
  utils: {
    api: Utils.useReturnsApi,
  },
};
