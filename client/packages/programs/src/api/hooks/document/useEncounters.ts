import {
  EncounterFilterInput,
  EncounterNodeStatus,
  useQuery,
} from '@openmsupply-client/common';
import { EncounterListParams, useEncounterApi } from '../utils/useEncounterApi';

export const useEncounters = (params: EncounterListParams) => {
  const api = useEncounterApi();

  const filterBy: EncounterFilterInput = {
    ...params.filterBy,
    status: {
      ...params.filterBy?.status,
      notEqualTo: EncounterNodeStatus.Deleted,
    },
  };
  const p = {
    ...params,
    filterBy,
  };
  return useQuery(api.keys.paramList(p), () => api.list(p));
};
