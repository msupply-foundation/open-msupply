import { create } from '@openmsupply-client/common';
import { ProgramPatientRowFragment } from '@openmsupply-client/system';

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
  id: string;
  code?: string;
  code2?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address1?: string;
  phone?: string;
  dateOfDeath?: string;
  isDeceased?: boolean;
}
/**
 * Stores:
 * - `documentName` An existing patient document has been selected but might not be loaded yet.
 * - `currentPatient` An existing patient document that has been loaded.
 * - `createNewPatient` Patient information about a patient that does not exist yet.
 */
interface PatientStoreState {
  documentName: string | undefined;
  setDocumentName: (documentName: string | undefined) => void;

  currentPatient: ProgramPatientRowFragment | undefined;
  setCurrentPatient: (patient: ProgramPatientRowFragment) => void;

  createNewPatient?: CreateNewPatient;
  setCreateNewPatient: (update: CreateNewPatient | undefined) => void;
  updateCreateNewPatient: (patch: Partial<CreateNewPatient>) => void;
}

export const usePatientStore = create<PatientStoreState>(set => ({
  documentName: undefined,
  setDocumentName: (documentName: string | undefined) =>
    set(state => ({ ...state, documentName })),

  currentPatient: undefined,
  setCurrentPatient: (patient: ProgramPatientRowFragment | undefined) =>
    set(state => ({ ...state, currentPatient: patient })),

  createNewPatient: undefined,
  setCreateNewPatient: update =>
    set(() => ({
      createNewPatient: update,
    })),
  updateCreateNewPatient: patch =>
    set(state => {
      if (!state.createNewPatient) {
        console.error(
          'usePatientCreateStore: updatePatient() can only be used after a patient is set using setNewPatient()'
        );
        return state;
      }
      return {
        createNewPatient: { ...state.createNewPatient, ...patch },
      };
    }),
}));
