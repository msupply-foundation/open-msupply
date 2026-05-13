import { FilterBy, useQuery } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useListSentPurchaseOrders = (
  filterBy: FilterBy | null,
  enabled = true
) => {
  const api = useInboundApi();

  return useQuery({
    queryKey: api.keys.listSendPurchaseOrders(),
    queryFn: async () => {
      const result = await api.get.listSentPurchaseOrders(filterBy);
      if (!result) {
        throw new Error('Failed to fetch purchase orders');
      }
      return result;
    },
    enabled,
  });
};
