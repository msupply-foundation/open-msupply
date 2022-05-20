import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatients = () => {
  const api = usePatientApi();
  const queryParams = useQueryParamsStore();
  return {
    ...useQuery(api.keys.paramList(queryParams.paramList()), () =>
      api.get.list({
        first: queryParams.pagination.first,
        offset: queryParams.pagination.offset,
        sortBy: queryParams.sort.sortBy,
      })
    ),
    ...queryParams,
  };
};
