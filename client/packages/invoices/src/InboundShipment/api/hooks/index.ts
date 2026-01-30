import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export * from './useDraftInboundLines';
export type { PatchDraftLineInput } from './useDraftInboundLines';

export const useInbound = {
  document: {
    get: Document.useInbound,
    list: Document.useInbounds,
    listAll: Document.useInboundsAll,

    delete: Document.useInboundDelete,
    insert: Document.useInsertInbound,
    update: Document.useUpdateInbound,
    updateTax: Document.useUpdateInboundServiceTax,

    fields: Document.useInboundFields,

    listInternalOrders: Document.useListInternalOrders,
    listInternalOrdersPromise: Document.useListInternalOrdersPromise,
    listInternalOrderLines: Document.useListInternalOrderLines,

    listSentPurchaseOrders: Document.useListSentPurchaseOrders,
  },
  lines: {
    list: Lines.useInboundLines,
    items: Lines.useInboundItems,
    serviceLines: Lines.useInboundServiceLines,
    lines: Lines.useInboundLines,

    insertFromInternalOrder: Lines.useLinesFromInternalOrder,
    delete: Lines.useDeleteInboundLines,
    deleteSelected: Lines.useInboundDeleteSelectedLines,
    save: Lines.useSaveInboundLines,

    zeroQuantities: Lines.useZeroInboundLinesQuantity,
  },
  utils: {
    addFromMasterList: Utils.useAddFromMasterList,
    api: Utils.useInboundApi,
    isDisabled: Utils.useIsInboundDisabled,
    isHoldable: Utils.useIsInboundHoldable,
    isStatusChangeDisabled: Utils.useIsStatusChangeDisabled,
  },
};
