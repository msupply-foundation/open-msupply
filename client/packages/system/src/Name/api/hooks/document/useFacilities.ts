import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

export const useFacilities = () => {
  const api = useNameApi();
  const {
    queryParams: { first, offset, sortBy },
  } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
  });

  const queryParams = { first, offset, sortBy };

  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.facilities(queryParams)
  );
};
