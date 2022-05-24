import { useQuery, useHandleUrlQueryParams } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';

export const useOutbounds = () => {
  const { queryParams } = useHandleUrlQueryParams('otherPartyName');
  const api = useOutboundApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
    ...queryParams,
  };
};
