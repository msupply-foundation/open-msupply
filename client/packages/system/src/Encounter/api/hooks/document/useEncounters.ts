import {
  FilterBy,
  useQuery,
  useQueryParamsStore,
} from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounters = (filterBy?: FilterBy) => {
  const api = useEncounterApi();
  const {
    sort: { sortBy },
    filter,
    pagination,
  } = useQueryParamsStore();

  const params = {
    sortBy,
    filterBy: filterBy ?? filter.filterBy,
    pagination: { offset: pagination.offset, first: pagination.first },
  };
  return {
    ...useQuery(api.keys.paramList(params), () => api.get.list(params)),
  };
};
