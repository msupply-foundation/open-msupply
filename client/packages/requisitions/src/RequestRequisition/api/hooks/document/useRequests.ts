import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useRequests = (options?: { enabled: boolean }) => {
  const queryParams = useQueryParamsStore();
  const api = useRequestApi();

  return {
    ...useQuery(
      api.keys.paramList(queryParams.paramList()),
      () => api.get.list(queryParams.paramList()),
      options
    ),
    ...queryParams,
  };
};
