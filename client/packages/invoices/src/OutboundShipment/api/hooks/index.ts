import { Utils } from './utils';
import { Lines } from './line';
import { Document } from './document';

export const useOutbound = {
  utils: {
    addFromMasterList: Utils.useAddFromMasterList,
    api: Utils.useOutboundApi,
    count: Utils.useOutboundCounts,
    isDisabled: Utils.useOutboundIsDisabled,
    number: Utils.useOutboundNumber,
  },

  document: {
    get: Document.useOutbound,
    list: Document.useOutbounds,
    listAll: Document.useOutboundsAll,

    update: Document.useOutboundUpdate,
    delete: Document.useOutboundDelete,
    insert: Document.useOutboundInsert,

    fields: Document.useOutboundFields,
    updateInvoiceTax: Document.useOutboundUpdateInvoiceTax,
    updateTax: Document.useUpdateOutboundTax,
    updateName: Document.useOutboundUpdateName,
  },

  line: {
    stockLines: Lines.useOutboundLines,
    serviceLines: Lines.useOutboundServiceLines,
    stockItems: Lines.useOutboundItems,
    rows: Lines.useOutboundRows,
    save: Lines.useOutboundSaveLines,
    delete: Lines.useOutboundDeleteLines,
    deleteSelected: Lines.useOutboundDeleteSelectedLines,
    allocateSelected: Lines.useOutboundAllocateSelectedLines,
  },
};
