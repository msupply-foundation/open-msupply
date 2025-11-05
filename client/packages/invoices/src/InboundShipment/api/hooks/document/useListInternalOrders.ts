import { useMutation, useQuery } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const POLLING_INTERVAL_MS = 3 * MILLISECONDS_PER_MINUTE;
const STALE_TIME_MS = 1 * MILLISECONDS_PER_MINUTE;

export const useListInternalOrdersPromise = () => {
  const api = useInboundApi();

  return useMutation(async (otherPartyId: string) => {
    const internalOrders = await api.get.listInternalOrders(otherPartyId);
    return {
      internalOrders,
    };
  });
};

export const useListInternalOrders = (otherPartyId: string) => {
  const api = useInboundApi();

  return {
    ...useQuery(
      api.keys.listInternalOrders(otherPartyId),
      () => api.get.listInternalOrders(otherPartyId),
      {
        cacheTime: POLLING_INTERVAL_MS,
        staleTime: STALE_TIME_MS,
        keepPreviousData: true,
      }
    ),
  };
};
