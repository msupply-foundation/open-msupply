import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useInbounds = () => {
  const { queryParams } = useUrlQueryParams({
    filterKey: 'otherPartyName',
    initialSort: { sort: 'createdDatetime', dir: 'desc' },
  });
  const api = useInboundApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
  };
};
