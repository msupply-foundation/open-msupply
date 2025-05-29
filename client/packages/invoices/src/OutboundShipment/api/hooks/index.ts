import { Utils } from './utils';
import { Lines } from './line';
import { Document } from './document';

export const useOutbound = {
  utils: {
    addFromMasterList: Utils.useAddFromMasterList,
    api: Utils.useOutboundApi,
    barcode: Utils.useBarcode,
    barcodeInsert: Utils.useBarcodeInsert,
    isDisabled: Utils.useOutboundIsDisabled,
    id: Utils.useOutboundId,
    selectedLines: Utils.useSelectedLines,
  },

  document: {
    get: Document.useOutbound,
    list: Document.useOutbounds,
    listAll: Document.useOutboundsAll,

    update: Document.useOutboundUpdate,
    delete: Document.useOutboundDelete,
    deleteRows: Document.useOutboundDeleteRows,
    insert: Document.useOutboundInsert,

    fields: Document.useOutboundFields,
    updateInvoiceTax: Document.useOutboundUpdateInvoiceTax,
    updateTax: Document.useUpdateOutboundTax,
    updateName: Document.useOutboundUpdateName,
  },

  line: {
    stockLines: Lines.useOutboundLines,
    serviceLines: Lines.useOutboundServiceLines,
    rows: Lines.useOutboundRows,
    save: Lines.useOutboundSaveLines,
    deleteSelected: Lines.useOutboundDeleteSelectedLines,
    allocateSelected: Lines.useOutboundAllocateSelectedLines,
  },
};
