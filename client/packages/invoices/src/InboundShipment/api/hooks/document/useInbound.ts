import { useParams, useQuery } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useInboundId = () => {
  const { invoiceId = '' } = useParams();
  return invoiceId;
};

export const useInbound = () => {
  const invoiceId = useInboundId();
  const api = useInboundApi();
  return useQuery(
    api.keys.detail(invoiceId),
    () => api.get.byId(invoiceId),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
