import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatients = () => {
  const api = usePatientApi();
  const { queryParams, urlQuery } = useUrlQueryParams({
    filterKey: 'lastName',
    initialSort: { key: 'code', dir: 'asc' },
  });
  if (urlQuery['firstName'] || `${urlQuery['identifier']}`) {
    const filterBy = queryParams.filterBy ?? {};
    if (urlQuery['firstName']) {
      filterBy['firstName'] = { like: `${urlQuery['firstName']}` };
    }
    if (urlQuery['identifier']) {
      filterBy['identifier'] = { like: `${urlQuery['identifier']}` };
    }
    queryParams.filterBy = filterBy;
  }
  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
  };
};
