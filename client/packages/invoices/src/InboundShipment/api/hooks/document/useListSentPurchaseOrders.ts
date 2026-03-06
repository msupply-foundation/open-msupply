import { FilterBy, useQuery } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useListSentPurchaseOrders = (filterBy: FilterBy | null) => {
  const api = useInboundApi();

  return useQuery({
    queryKey: api.keys.listSendPurchaseOrders(),
    queryFn: () => api.get.listSentPurchaseOrders(filterBy),
  });
};
