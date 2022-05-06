import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';

export const useOutbounds = () => {
  const queryParams = useQueryParamsStore();
  const api = useOutboundApi();

  return {
    ...useQuery(api.keys.paramList(queryParams.paramList()), () =>
      api.get.list(queryParams.paramList())
    ),
    ...queryParams,
  };
};
