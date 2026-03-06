import { FilterBy, useQuery } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useListSentPurchaseOrders = (filterBy: FilterBy | null) => {
  const api = useInboundApi();

  return useQuery(
    api.keys.listSendPurchaseOrders(),
    () => api.get.listSentPurchaseOrders(filterBy),
  );
};
