import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useResponse = {
  document: {
    get: Document.useResponse,
    list: Document.useResponses,
    listAll: Document.useResponsesAll,

    update: Document.useUpdateResponse,

    fields: Document.useResponseFields,
  },
  line: {
    list: Lines.useResponseLines,

    delete: Lines.useDeleteResponseLines,
    save: Lines.useSaveResponseLines,
  },
  utils: {
    api: Utils.useResponseApi,
    createOutbound: Utils.useCreateOutboundFromResponse,
    isDisabled: Utils.useIsResponseDisabled,
    supplyRequested: Utils.useSupplyRequestedQuantity,
  },
};
