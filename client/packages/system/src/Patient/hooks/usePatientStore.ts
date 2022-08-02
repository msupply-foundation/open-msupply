import { zustand } from '@openmsupply-client/common';

interface PatientStoreState {
  documentName: string | undefined;
  setDocumentName: (documentName: string | undefined) => void;
}

export const usePatientStore = zustand<PatientStoreState>(set => ({
  documentName: undefined,
  setDocumentName: (documentName: string | undefined) =>
    set(state => ({ ...state, documentName })),
}));
