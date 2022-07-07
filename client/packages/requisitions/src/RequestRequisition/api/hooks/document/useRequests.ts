import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useRequests = (options?: { enabled: boolean }) => {
  const { queryParams } = useUrlQueryParams({
    filterKey: 'otherPartyName',
    initialSort: { key: 'createdDatetime', dir: 'desc' },
  });
  const api = useRequestApi();

  return {
    ...useQuery(
      api.keys.paramList(queryParams),
      () => api.get.list(queryParams),
      options
    ),
  };
};
