import { useQuery } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useInboundCounts = () => {
  const api = useInboundApi();

  return useQuery(api.keys.count(), api.dashboard.shipmentCount, {
    retry: false,
    onError: () => {},
  });
};
