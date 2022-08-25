import { usePatientId } from '../utils/usePatientId';
import { useEncounter } from '../../../../Encounter';

export const useEncounters = () => {
  const patientId = usePatientId();
  const filterBy = { patientId: { equalTo: patientId } };

  return useEncounter.document.list(filterBy);
};
