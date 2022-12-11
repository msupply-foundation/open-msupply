import create from 'zustand';
import { DocumentRegistryFragment } from '@openmsupply-client/programs/src/api';

// Copied from the schema definition
export enum Gender {
  /** 703118005 Feminine gender */
  FEMALE = 'FEMALE',
  /** 703117000 Masculine gender*/
  MALE = 'MALE',
  /** 407379008 transgendered transsexual, female-to-male*/
  TRANSGENDER_MALE = 'TRANSGENDER_MALE',
  /** 407378000 Surgically transgendered transsexual, male-to-female*/
  TRANSGENDER_FEMALE = 'TRANSGENDER_FEMALE',
  /** 394743007 Gender unknown*/
  UNKNOWN = 'UNKNOWN',
  /** 772004004 Non-binary gender*/
  NON_BINARY = 'NON_BINARY',
}

export interface CreateNewPatient {
  documentRegistry: DocumentRegistryFragment;
  id: string;
  code?: string;
  code2?: string;
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
export const usePatientCreateStore = create<CreateNewPatientState>(set => ({
  patient: undefined,
  setNewPatient: update =>
    set(() => ({
      patient: update,
    })),
  updatePatient: patch =>
    set(state => {
      if (!state.patient) {
        console.error(
          'usePatientCreateStore: updatePatient() can only be used after a patient is set using setNewPatient()'
        );
        return state;
      }
      return {
        patient: { ...state.patient, ...patch },
      };
    }),
}));
