import { useQuery, keepPreviousData } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const POLLING_INTERVAL_MS = 3 * MILLISECONDS_PER_MINUTE;
const STALE_TIME_MS = 1 * MILLISECONDS_PER_MINUTE;

export const useListInternalOrders = (otherPartyId: string) => {
  const api = useInboundApi();

  const query = useQuery({
    queryKey: api.keys.listInternalOrders(otherPartyId),
    queryFn: () => api.get.listInternalOrders(otherPartyId),
    gcTime: POLLING_INTERVAL_MS,
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
    enabled: !!otherPartyId
  });

  // For imperative usage, return a promise
  const fetchInternalOrders = async () => {
    const result = await query.refetch();
    return { internalOrders: result.data };
  };

  return {
    ...query,
    fetchInternalOrders,
  };
};
