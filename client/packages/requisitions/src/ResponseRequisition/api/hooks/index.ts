import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useResponse = {
  document: {
    get: Document.useResponse,
    list: Document.useResponses,
    listAll: Document.useResponsesAll,

    insert: Document.useInsertResponse,
    update: Document.useUpdateResponse,

    fields: Document.useResponseFields,
  },
  line: {
    list: Lines.useResponseLines,
    stats: Lines.useResponseLineStatsData,

    delete: Lines.useDeleteResponseLines,
    save: Lines.useSaveResponseLines,
  },
  utils: {
    api: Utils.useResponseApi,
    createOutbound: Utils.useCreateOutboundFromResponse,
    isDisabled: Utils.useIsResponseDisabled,
    isRemoteAuthorisation: Utils.useIsRemoteAuthorisation,
    preferences: Utils.useRequisitionPreferences,
    supplyRequested: Utils.useSupplyRequestedQuantity,
    isDisabledByAuthorisation: Utils.useIsDisabledByAuthorisation,
  },
};
