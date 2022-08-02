import { zustand } from '@openmsupply-client/common';
import { PatientModal } from '../DetailView';

interface PatientModalState {
  current: PatientModal | undefined;
  documentName: string | undefined;
  documentType: string | undefined;
  reset: () => void;
  setCurrent: (current: PatientModal | undefined) => void;
  setDocumentName: (documentName: string | undefined) => void;
  setDocumentType: (documentType: string | undefined) => void;
}

export const usePatientModalStore = zustand<PatientModalState>(set => ({
  current: undefined,
  documentName: undefined,
  documentType: undefined,
  reset: () =>
    set(state => ({
      ...state,
      current: undefined,
      documentName: undefined,
      documentType: undefined,
    })),
  setCurrent: (current: PatientModal | undefined) =>
    set(state => ({ ...state, current })),
  setDocumentName: (documentName: string | undefined) =>
    set(state => ({ ...state, documentName })),
  setDocumentType: (documentType: string | undefined) =>
    set(state => ({ ...state, documentType })),
}));
