import { useQuery } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';
import { ListParams } from '../../api';

export const usePatientFullSearch = (params: ListParams) => {
  const api = usePatientApi();
  return useQuery(
    api.keys.paramList(params),
    () =>
      api.get.list({
        first: params.first,
        offset: params.offset,
        sortBy: params.sortBy,
        filterBy: params.filterBy,
      }),
    {
      enabled: !!params.filterBy,
    }
  );
};
