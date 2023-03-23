// import { zustand } from '@openmsupply-client/common';
import { PatientRowFragment } from '../../../system/src/Patient/api';
import { create } from 'zustand';

// stores the `documentName` for the currently viewed patient document
interface PatientStoreState {
  documentName: string | undefined;
  setDocumentName: (documentName: string | undefined) => void;
  currentPatient: PatientRowFragment | undefined;
  setCurrentPatient: (patient: PatientRowFragment) => void;
}

export const usePatientStore = create<PatientStoreState>(set => ({
  documentName: undefined,
  setDocumentName: (documentName: string | undefined) =>
    set(state => ({ ...state, documentName })),
  currentPatient: undefined,
  setCurrentPatient: (patient: PatientRowFragment | undefined) =>
    set(state => ({ ...state, currentPatient: patient })),
}));
