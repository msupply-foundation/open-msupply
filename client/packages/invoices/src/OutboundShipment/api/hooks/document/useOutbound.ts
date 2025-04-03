import { useQuery } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutboundId } from '../utils/useOutboundId';

export const useOutbound = () => {
  const id = useOutboundId();
  const api = useOutboundApi();

  return useQuery(
    api.keys.detail(id),
    () => api.get.byId(id),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
