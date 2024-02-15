import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useReturns = {
  document: {
    listOutbound: Document.useOutbounds,
    listAllOutbound: Document.useOutboundsAll,
  },
  lines: {
    newReturnLines: Lines.useNewSupplierReturnLines,
  },
  utils: {
    api: Utils.useReturnsApi,
  },
};
