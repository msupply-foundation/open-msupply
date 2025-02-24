import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useInbound = {
  document: {
    get: Document.useInbound,
    list: Document.useInbounds,
    listAll: Document.useInboundsAll,

    delete: Document.useInboundDelete,
    deleteRows: Document.useInboundDeleteRows,
    insert: Document.useInsertInbound,
    update: Document.useUpdateInbound,
    updateTax: Document.useUpdateInboundServiceTax,

    fields: Document.useInboundFields,
    next: Document.useNextItem,

    listInternalOrders: Document.useListInternalOrders,
    listInternalOrderLines: Document.useListInternalOrderLines,
  },
  lines: {
    list: Lines.useInboundLines,
    items: Lines.useInboundItems,
    rows: Lines.useInboundRows,
    serviceLines: Lines.useInboundServiceLines,

    insertFromInternalOrder: Lines.useLinesFromInternalOrder,
    delete: Lines.useDeleteInboundLines,
    deleteSelected: Lines.useDeleteSelectedLines,
    save: Lines.useSaveInboundLines,

    zeroQuantities: Lines.useZeroInboundLinesQuantity,
  },
  utils: {
    addFromMasterList: Utils.useAddFromMasterList,
    api: Utils.useInboundApi,
    isDisabled: Utils.useIsInboundDisabled,
    isHoldable: Utils.useIsInboundHoldable,
    isStatusChangeDisabled: Utils.useIsStatusChangeDisabled,
    selectedLines: Utils.useSelectedLines,
  },
};
