import { create } from '@openmsupply-client/common';
import { FormInputData } from '@openmsupply-client/programs';

interface PatientModalDocument {
  name?: string;
  patientId?: string;
  type?: string;
  createDocument?: FormInputData;
}

export enum PatientModal {
  Program = 'PROGRAM',
  ProgramSearch = 'PROGRAM_SEARCH',
  Encounter = 'ENCOUNTER',
  ContactTraceSearch = 'CONTACT_TRACE_SEARCH',
  Insurance = 'INSURANCE',
}

/**
 * The state of the various modals used in the patient detail area
 * `current` is the active / displayed modal - set to `undefined` to hide them all
 * `documentName` and `documentType` define the JsonForm doc
 */
interface PatientModalState {
  current?: PatientModal;
  document?: PatientModalDocument;
  reset: () => void;
  /** Just set the modal, the modal has to figure out what to do by itself */
  setModal: (current?: PatientModal) => void;
  /** Modal state for editing an existing document */
  setEditModal: (
    current: PatientModal,
    documentType: string,
    documentName: string
  ) => void;
  /** Modal state for creating a new document using some initial data (createDocument) */
  setCreationModal: (
    current: PatientModal,
    documentType: string,
    createDocument: FormInputData
  ) => void;
}

export const usePatientModalStore = create<PatientModalState>(set => ({
  current: undefined,
  document: undefined,
  reset: () =>
    set(state => ({
      ...state,
      current: undefined,
      document: undefined,
    })),
  setModal: (current?: PatientModal) =>
    set(state => ({
      ...state,
      document: undefined,
      current,
    })),

  setEditModal: (
    current: PatientModal,
    documentType: string,
    documentName: string
  ) =>
    set(state => ({
      ...state,
      current,
      document: { type: documentType, name: documentName },
    })),

  setCreationModal: (
    current: PatientModal,
    documentType: string,
    createDocument: FormInputData
  ) =>
    set(state => ({
      ...state,
      current,
      document: { type: documentType, createDocument },
    })),
}));
