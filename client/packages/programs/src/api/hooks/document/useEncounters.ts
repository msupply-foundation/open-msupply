import { useQuery } from '@openmsupply-client/common';
import { EncounterListParams, useEncounterApi } from '../utils/useEncounterApi';

export const useEncounters = (params: EncounterListParams) => {
  const api = useEncounterApi();
  return useQuery({
    queryKey: api.keys.paramList(params),
    queryFn: () => api.list(params),
    keepPreviousData: true,
    enabled: !!params?.sortBy?.key
  });
};
