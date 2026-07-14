import { useQuery } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounterFields = (
  patientId: string,
  fields: string[],
  enabled?: boolean
) => {
  const api = useEncounterApi();

  return useQuery({
    queryKey: api.keys.encounterFields(patientId, fields),
    queryFn: () => api.encounterFields(patientId, fields),
    refetchOnMount: false,
    gcTime: 0,
    enabled
  });
};
