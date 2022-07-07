import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';

export const useOutbounds = () => {
  const { queryParams } = useUrlQueryParams({
    filterKey: 'otherPartyName',
    initialSort: { key: 'createdDatetime', dir: 'desc' },
  });
  const api = useOutboundApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
  };
};
