import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatients = () => {
  const api = usePatientApi();
  const { queryParams } = useUrlQueryParams({
    // filterKey: 'otherPartyName',
    initialSortKey: 'code',
  });
  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
  };
};
