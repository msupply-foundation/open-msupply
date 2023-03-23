import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

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
    next: Document.useNextItem,
  },
  lines: {
    list: Lines.useInboundLines,
    items: Lines.useInboundItems,
    rows: Lines.useInboundRows,
    serviceLines: Lines.useInboundServiceLines,

    delete: Lines.useDeleteInboundLines,
    deleteSelected: Lines.useDeleteSelectedLines,
    save: Lines.useSaveInboundLines,
  },
  utils: {
    addFromMasterList: Utils.useAddFromMasterList,
    api: Utils.useInboundApi,
    counts: Utils.useInboundCounts,
    isDisabled: Utils.useIsInboundDisabled,
    isStatusChangeDisabled: Utils.useIsStatusChangeDisabled,
  },
};
