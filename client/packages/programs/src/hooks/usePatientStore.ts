import { zustand } from '@openmsupply-client/common';
import { PatientRowFragment } from '../../../system/src/Patient/api';

// stores the `documentName` for the currently viewed patient document
interface PatientStoreState {
  documentName: string | undefined;
  setDocumentName: (documentName: string | undefined) => void;
  currentPatient: PatientRowFragment | undefined;
  setCurrentPatient: (patient: PatientRowFragment) => void;
}

export const usePatientStore = zustand<PatientStoreState>(set => ({
  documentName: undefined,
  setDocumentName: (documentName: string | undefined) =>
    set(state => ({ ...state, documentName })),
  currentPatient: undefined,
  setCurrentPatient: (patient: PatientRowFragment) =>
    set(state => ({ ...state, currentPatient: patient })),
}));
