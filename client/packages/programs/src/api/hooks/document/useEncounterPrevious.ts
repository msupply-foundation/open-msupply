import { useMutation } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounterPrevious = (
  patientId: string,
  currentEncounter: Date
) => {
  const api = useEncounterApi();

  return {
    ...useMutation(
      api.keys.previous(patientId, currentEncounter.getTime()),
      () => api.previousEncounters(patientId, currentEncounter)
    ),
  };
};
