import { useQuery } from '@openmsupply-client/common';
import { EncounterListParams, useEncounterApi } from '../utils/useEncounterApi';

export const useEncounters = (params: EncounterListParams) => {
  const api = useEncounterApi();
  return {
    ...useQuery(api.keys.paramList(params), () => api.list(params)),
  };
};
