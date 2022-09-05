import {
  FilterBy,
  useQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounters = (filterBy?: FilterBy) => {
  const api = useEncounterApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'startDatetime', dir: 'desc' },
  });
  const params = {
    ...queryParams,
    filterBy,
  };
  return {
    ...useQuery(api.keys.paramList(params), () => api.get.list(params)),
  };
};
