import { usePatient } from './usePatient';
import { usePatients, usePatientsPromise } from './usePatients';
import { usePatientsAll } from './usePatientsAll';
import { usePatientFullSearch } from './usePatientFullSearch';
import { useInsertPatient } from './useInsertPatient';
import { useUpdatePatient } from './useUpdatePatient';
import { useInsertProgramPatient } from './useInsertProgramPatient';
import { useUpdateProgramPatient } from './useUpdateProgramPatient';
import { useDocument } from '@openmsupply-client/programs';

export const Document = {
  usePatient,
  usePatients,
  usePatientsAll,
  usePatientFullSearch,
  useInsertPatient,
  useUpdatePatient,
  useInsertProgramPatient,
  useUpdateProgramPatient,
  useDocumentHistory: useDocument.get.history,
  usePatientsPromise,
};
