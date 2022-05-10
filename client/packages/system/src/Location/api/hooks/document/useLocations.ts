import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useLocationApi } from '../utils/useLocationApi';

export const useLocations = () => {
  const api = useLocationApi();
  const queryParams = useQueryParamsStore();
  const result = useQuery(api.keys.paramList(queryParams.paramList()), () =>
    api.get.list(queryParams.paramList())
  );

  return { ...queryParams, ...result };
};
