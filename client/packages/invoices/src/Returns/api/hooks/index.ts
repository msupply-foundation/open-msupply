import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useReturns = {
  document: {
    listOutbound: Document.useOutbounds,
    listAllOutbound: Document.useOutboundsAll,
    outboundReturn: Document.useOutboundReturn,

    insertSupplierReturn: Document.useInsertSupplierReturn,
    deleteOutboundRows: Document.useOutboundDeleteRows,
  },
  lines: {
    supplierReturnLines: Lines.useNewSupplierReturnLines,
    inboundReturnLines: Lines.useInboundReturnLines,
  },
  utils: {
    api: Utils.useReturnsApi,
  },
};
