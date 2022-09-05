import { zustand } from '@openmsupply-client/common';
import { CreateDocument } from '../JsonForms';
import { PatientModal } from '../PatientView';

interface PatientModalDocument {
  name?: string;
  type?: string;
  createDocument?: CreateDocument;
}

/**
 * The state of the various modals used in the patient detail area
 * `current` is the active / displayed modal - set to `undefined` to hide them all
 * `documentName` and `documentType` define the JsonForm doc
 */
interface PatientModalState {
  current?: PatientModal;
  document?: PatientModalDocument;
  programType?: string;
  reset: () => void;
  /** Just set the modal, the modal has to figure out what to do by itself */
  setModal: (current?: PatientModal) => void;
  /** Modal state for editing an existing document */
  setEditModal: (
    current: PatientModal,
    documentType: string,
    documentName: string,
    programType: string
  ) => void;
  /** Modal state for creating a new document */
  setCreationModal: (
    current: PatientModal,
    documentType: string,
    createDocument: CreateDocument,
    programType: string
  ) => void;
}

export const usePatientModalStore = zustand<PatientModalState>(set => ({
  current: undefined,
  document: undefined,
  reset: () =>
    set(state => ({
      ...state,
      current: undefined,
      document: undefined,
      programType: undefined,
    })),
  setModal: (current?: PatientModal) =>
    set(state => ({
      ...state,
      document: undefined,
      programType: undefined,
      current,
    })),

  setEditModal: (
    current: PatientModal,
    documentType: string,
    documentName: string,
    programType: string
  ) =>
    set(state => ({
      ...state,
      current: current,
      document: { type: documentType, name: documentName },
      programType: programType,
    })),

  setCreationModal: (
    current: PatientModal,
    documentType: string,
    createDocument: CreateDocument,
    programType: string
  ) =>
    set(state => ({
      ...state,
      current: current,
      document: { type: documentType, createDocument },
      programType: programType,
    })),
}));
