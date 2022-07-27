import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useLocationApi } from '../utils/useLocationApi';

export const useLocations = () => {
  const api = useLocationApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
  });
  const result = useQuery(api.keys.paramList(queryParams), () =>
    api.get.list(queryParams)
  );

  return { ...queryParams, ...result };
};
