import { create } from '@openmsupply-client/common';
import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useHideOverStocked = create<{
  on: boolean;
  toggle: () => void;
}>(set => ({
  toggle: () => set(state => ({ ...state, on: !state.on })),
  on: false,
}));

export const useRequest = {
  document: {
    get: Document.useRequest,
    list: Document.useRequests,
    listAll: Document.useRequestsAll,

    delete: Document.useDeleteRequests,
    deleteSelected: Document.useDeleteSelectedRequisitions,
    insert: Document.useInsertRequest,
    insertProgram: Document.useInsertProgramRequest,
    update: Document.useUpdateRequest,

    fields: Document.useRequestFields,
  },
  line: {
    chartData: Lines.useRequestLineChartData,
    delete: Lines.useDeleteRequestLines,
    deleteLine: Lines.useDeleteRequestLine,
    list: Lines.useRequestLines,
    save: Lines.useSaveRequestLines,
  },
  utils: {
    api: Utils.useRequestApi,
    addFromMasterList: Utils.useAddFromMasterList,
    isDisabled: Utils.useIsRequestDisabled,
    isRemoteAuthorisation: Utils.useIsRemoteAuthorisation,
    suggestedQuantity: Utils.useSuggestedQuantity,
    programSettings: Utils.useProgramSettings,
    preferences: Utils.useRequisitionPreferences,
    isProgram: Utils.useIsProgramRequest,
  },
};
