import { useQuery } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useListInternalOrders = (otherPartyId: string) => {
  const api = useInboundApi();

  return {
    ...useQuery(api.keys.listInternalOrders(otherPartyId), () =>
      api.get.listInternalOrders(otherPartyId)
    ),
  };
};
