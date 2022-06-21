import { Utils } from './utils';
import { Lines } from './line';
import { Document } from './document';

export const useOutbound = {
  utils: {
    isDisabled: Utils.useOutboundIsDisabled,
    number: Utils.useOutboundNumber,
    api: Utils.useOutboundApi,
    addFromMasterList: Utils.useAddFromMasterList,
  },

  document: {
    get: Document.useOutbound,
    list: Document.useOutbounds,
    listAll: Document.useOutboundsAll,

    update: Document.useOutboundUpdate,
    delete: Document.useOutboundDelete,
    insert: Document.useOutboundInsert,

    fields: Document.useOutboundFields,
    updateTax: Document.useUpdateOutboundTax,
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
