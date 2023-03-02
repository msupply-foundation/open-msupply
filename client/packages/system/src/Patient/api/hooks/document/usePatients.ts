import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { ListParams } from '../../api';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatients = (customQuery?: ListParams) => {
  const api = usePatientApi();
  const { queryParams } = useUrlQueryParams({
    filterKey: ['lastName', 'firstName', 'identifier'],
    initialSort: { key: 'code', dir: 'asc' },
  });

  const query = customQuery ?? queryParams;

  return {
    ...useQuery(api.keys.paramList(query), () => api.get.list(query)),
  };
};
