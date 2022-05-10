import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useResponses = () => {
  const queryParams = useQueryParamsStore();
  const api = useResponseApi();

  return {
    ...useQuery(api.keys.paramList(queryParams.paramList()), () =>
      api.get.list(queryParams.paramList())
    ),
    ...queryParams,
  };
};
