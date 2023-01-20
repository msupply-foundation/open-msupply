import { usePatient } from './usePatient';
import { usePatients } from './usePatients';
import { usePatientsAll } from './usePatientsAll';
import { useInsertPatient } from './useInsertPatient';
import { useUpdatePatient } from './useUpdatePatient';
import { useDocumentHistory } from '@openmsupply-client/programs/src/api/hooks/document/useDocumentHistory';

export const Document = {
  usePatient,
  usePatients,
  usePatientsAll,
  useInsertPatient,
  useUpdatePatient,
  useDocumentHistory,
};
