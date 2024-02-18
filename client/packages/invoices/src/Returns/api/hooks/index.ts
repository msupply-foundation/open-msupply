import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useReturns = {
  document: {
    listOutbound: Document.useOutbounds,
    listAllOutbound: Document.useOutboundsAll,
    deleteOutboundRows: Document.useOutboundDeleteRows,

    insertSupplierReturn: Document.useInsertSupplierReturn,
  },
  lines: {
    newReturnLines: Lines.useNewSupplierReturnLines,
  },
  utils: {
    api: Utils.useReturnsApi,
  },
};
