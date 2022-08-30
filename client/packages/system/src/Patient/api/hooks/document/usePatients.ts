import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatients = () => {
  const api = usePatientApi();
  const {
    sort: { sortBy },
    filter: { filterBy },
    pagination: { page, first, offset },
  } = useQueryParamsStore();

  const queryParams = {
    page,
    first,
    offset,
    sortBy,
    filterBy,
  };

  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
  };
};
