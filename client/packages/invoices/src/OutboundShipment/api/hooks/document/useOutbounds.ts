import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';

export const useOutbounds = () => {
  const { queryParams } = useUrlQueryParams({
    filterKey: 'otherPartyName',
    initialSortKey: 'otherPartyName',
  });
  const api = useOutboundApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
    ...queryParams,
  };
};
