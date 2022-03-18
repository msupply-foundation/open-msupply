import * as Utils from './utils';
import * as Lines from './line';
import * as Document from './document';

export const useOutbound = {
  utils: {
    isDisabled: Utils.useOutboundIsDisabled,
    number: Utils.useOutboundNumber,
    api: Utils.useOutboundApi,
  },

  document: {
    get: Document.useOutbound,
    list: Document.useOutbounds,

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
  },
};
