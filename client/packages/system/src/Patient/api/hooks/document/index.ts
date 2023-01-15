import { usePatient } from './usePatient';
import { usePatients } from './usePatients';
import { usePatientsAll } from './usePatientsAll';
import { useInsertPatient } from './useInsertPatient';
import { useUpdatePatient } from './useUpdatePatient';
import { useDocumentHistory } from './useDocumentHistory';
import { useEncounters } from './useEncounters';
import { useProgramEncounters } from './useProgramEncounters';

export const Document = {
  usePatient,
  usePatients,
  usePatientsAll,
  useInsertPatient,
  useUpdatePatient,
  useDocumentHistory,
  useEncounters,
  useProgramEncounters,
};
