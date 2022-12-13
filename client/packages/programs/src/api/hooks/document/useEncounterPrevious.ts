import { useQuery } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounterPrevious = (
  patientId: string | undefined,
  currentEncounter: Date
) => {
  const api = useEncounterApi();

  return {
    ...useQuery(
      api.keys.previous(patientId ?? '', currentEncounter.getTime()),
      () => api.previousEncounters(patientId ?? '', currentEncounter),
      { enabled: !!patientId }
    ),
  };
};
