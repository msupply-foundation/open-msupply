import { zustand } from '@openmsupply-client/common';
import { PatientModal } from '../DetailView';

// the state of the various modals used in the patient detail area
// `current` is the active / displayed modal - set to `undefined` to hide them all
// `documentName` and `documentType` define the JsonForm doc
interface PatientModalState {
  current?: PatientModal;
  documentName?: string;
  documentType?: string;
  programType?: string;
  reset: () => void;
  setCurrent: (current?: PatientModal) => void;
  setDocumentName: (documentName?: string) => void;
  setDocumentType: (documentType?: string) => void;
  setProgramType: (documentType?: string) => void;
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
  setCurrent: (current?: PatientModal) => set(state => ({ ...state, current })),
  setDocumentName: (documentName?: string) =>
    set(state => ({ ...state, documentName })),
  setDocumentType: (documentType?: string) =>
    set(state => ({ ...state, documentType })),
  setProgramType: (programType?: string) =>
    set(state => ({ ...state, programType })),
}));
