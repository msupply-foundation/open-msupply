import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useInbounds = () => {
  const queryParams = useQueryParamsStore();
  const api = useInboundApi();

  return {
    ...useQuery(api.keys.paramList(queryParams.paramList()), () =>
      api.get.list(queryParams.paramList())
    ),
    ...queryParams,
  };
};
