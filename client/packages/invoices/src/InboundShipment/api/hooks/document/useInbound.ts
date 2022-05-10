import { useParams, useQuery } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useInboundNumber = () => {
  const { invoiceNumber = '' } = useParams();
  return invoiceNumber;
};

export const useInbound = () => {
  const invoiceNumber = useInboundNumber();
  const api = useInboundApi();
  return useQuery(
    api.keys.detail(invoiceNumber),
    () => api.get.byNumber(invoiceNumber),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
