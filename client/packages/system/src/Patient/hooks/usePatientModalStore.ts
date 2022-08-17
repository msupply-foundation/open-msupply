import { zustand } from '@openmsupply-client/common';
import { CreateDocument } from '../JsonForms';
import { PatientModal } from '../PatientView';

interface PatientModalDocument {
  name?: string;
  type?: string;
  createDocument?: CreateDocument;
}

// the state of the various modals used in the patient detail area
// `current` is the active / displayed modal - set to `undefined` to hide them all
// `documentName` and `documentType` define the JsonForm doc
interface PatientModalState {
  current?: PatientModal;
  document?: PatientModalDocument;
  documentCreate?: CreateDocument;
  documentName?: string;
  documentType?: string;
  programType?: string;
  reset: () => void;
  setCurrent: (current?: PatientModal) => void;
  setDocument: (document: PatientModalDocument) => void;
  setProgramType: (documentType?: string) => void;
}

export const usePatientModalStore = zustand<PatientModalState>(set => ({
  current: undefined,
  document: undefined,
  reset: () =>
    set(state => ({
      ...state,
      current: undefined,
      documentName: undefined,
      documentType: undefined,
    })),
  setCurrent: (current?: PatientModal) => set(state => ({ ...state, current })),
  setDocument: (document?: PatientModalDocument) =>
    set(state => ({ ...state, document })),
  setProgramType: (programType?: string) =>
    set(state => ({ ...state, programType })),
}));
