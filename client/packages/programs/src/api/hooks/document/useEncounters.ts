import { useQuery, keepPreviousData } from '@openmsupply-client/common';
import { EncounterListParams, useEncounterApi } from '../utils/useEncounterApi';

export const useEncounters = (params: EncounterListParams) => {
  const api = useEncounterApi();
  return useQuery({
    queryKey: api.keys.paramList(params),
    queryFn: () => api.list(params),
    placeholderData: keepPreviousData,
    enabled: !!params?.sortBy?.key
  });
};
