import { useQuery } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useLatestPatientEncounter = (
  patientId: string | undefined,
  encounterType: string | undefined
) => {
  const api = usePatientApi();
  return useQuery(
    api.keys.latestPatientEncounter(patientId || '', encounterType),
    () => api.latestPatientEncounter(patientId || '', encounterType),
    {
      enabled: !!patientId,
    }
  );
};
