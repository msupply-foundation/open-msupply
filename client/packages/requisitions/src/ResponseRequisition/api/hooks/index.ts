import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useResponse = {
  document: {
    get: Document.useResponse,
    list: Document.useResponses,
    listAll: Document.useResponsesAll,

    insert: Document.useInsertResponse,
    insertProgram: Document.useInsertProgramResponse,
    update: Document.useUpdateResponse,
    delete: Document.useDeleteResponses,
    deleteSelected: Document.useDeleteSelectedResponseRequisitions,
    fields: Document.useResponseFields,
    indicators: Document.useIndicators,
    updateIndicatorValue: Document.useUpdateIndicatorValue,
  },
  line: {
    list: Lines.useResponseLines,
    stats: Lines.useResponseLineStatsData,
    delete: Lines.useDeleteResponseLines,
    save: Lines.useSaveResponseLines,
    insert: Lines.useInsertResponseLines,
    updateIndicators: Lines.useUpdateLine,
  },
  utils: {
    api: Utils.useResponseApi,
    createOutbound: Utils.useCreateOutboundFromResponse,
    isDisabled: Utils.useIsResponseDisabled,
    isRemoteAuthorisation: Utils.useIsRemoteAuthorisation,
    preferences: Utils.useRequisitionPreferences,
    supplyRequested: Utils.useSupplyRequestedQuantity,
    isDisabledByAuthorisation: Utils.useIsDisabledByAuthorisation,
    programSettings: Utils.useProgramSettings,
  },
};
