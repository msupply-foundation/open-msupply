import { useQuery } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutboundNumber } from './../utils/useOutboundNumber';

export const useOutbound = () => {
  const outboundNumber = useOutboundNumber();
  const api = useOutboundApi();

  return useQuery(
    api.keys.detail(outboundNumber),
    () => api.get.byNumber(outboundNumber),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
