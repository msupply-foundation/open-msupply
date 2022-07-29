import { DocumentRegistryFragment } from '@openmsupply-client/common';
import create from 'zustand';

// Copied from the schema definition
export enum Gender {
  /** 703118005 Feminine gender */
  Female = 'Female',
  /** 703117000 Masculine gender*/
  Male = 'Male',
  /** 407379008 transgendered transsexual, female-to-male*/
  TransgenderMale = 'TransgenderMale',
  /** 407378000 Surgically transgendered transsexual, male-to-female*/
  TransgenderFemale = 'TransgenderFemale',
  /** 394743007 Gender unknown*/
  Unknown = 'Unknown',
  /** 772004004 Non-binary gender*/
  NonBinary = 'NonBinary',
}

export interface CreateNewPatient {
  documentRegistry: DocumentRegistryFragment;
  id: string;
  code?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: Gender;
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
