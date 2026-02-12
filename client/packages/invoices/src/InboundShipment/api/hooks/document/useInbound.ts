import {
  useParams,
  useQuery,
  useQueryClient,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { INBOUND, INBOUND_LINE } from './keys';

export const useInboundId = () => {
  const { invoiceId = '' } = useParams();
  return invoiceId;
};

export const useInbound = () => {
  const invoiceId = useInboundId();
  const api = useInboundApi();
  const queryClient = useQueryClient();

  const invalidateQuery = () => {
    queryClient.invalidateQueries([INBOUND, INBOUND_LINE, invoiceId]);
  };

  const query = useQuery(
    [INBOUND, INBOUND_LINE, invoiceId],
    () => api.get.byId(invoiceId),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );

  return {
    ...query,
    invalidateQuery,
  };
};
