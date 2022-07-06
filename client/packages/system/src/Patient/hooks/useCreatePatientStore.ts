import { DocumentRegistryFragment } from '@openmsupply-client/common';
import create from 'zustand';

export interface CreateNewPatient {
  documentRegistry: DocumentRegistryFragment;
  id: string;
  firstName?: string;
  lastName?: string;
  dob?: Date;
  canSearch?: boolean;
  canCreate?: boolean;
}

interface CreateNewPatientState {
  patient?: CreateNewPatient;
  setNewPatient: (update: CreateNewPatient | undefined) => void;
  updatePatient: (patch: Partial<CreateNewPatient>) => void;
}

/**
 * Stores temporary information for creating a new patient, e.g. to carry data over from the
 * create patient modal.
 */
export const useCreatePatientStore = create<CreateNewPatientState>(set => ({
  patient: undefined,
  setNewPatient: update =>
    set(() => ({
      patient: update,
    })),
  updatePatient: patch =>
    set(state => {
      if (!state.patient) {
        console.error(
          'useCreatePatientStore: updatePatient() can only be used after a patient is set using setNewPatient()'
        );
        return state;
      }
      return {
        patient: { ...state.patient, ...patch },
      };
    }),
}));
