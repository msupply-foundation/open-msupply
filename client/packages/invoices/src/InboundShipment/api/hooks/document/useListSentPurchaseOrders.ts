import { FilterBy, useQuery } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const POLLING_INTERVAL_MS = 3 * MILLISECONDS_PER_MINUTE;
const STALE_TIME_MS = 1 * MILLISECONDS_PER_MINUTE;

export const useListSentPurchaseOrders = (filterBy: FilterBy | null) => {
  const api = useInboundApi();

  return {
    ...useQuery(
      api.keys.listSendPurchaseOrders(),
      () => api.get.listSentPurchaseOrders(filterBy),
      {
        cacheTime: POLLING_INTERVAL_MS,
        staleTime: STALE_TIME_MS,
        keepPreviousData: true,
      }
    ),
  };
};
