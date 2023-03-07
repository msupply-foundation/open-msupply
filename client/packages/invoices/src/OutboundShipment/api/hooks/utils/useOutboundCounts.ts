import { useQuery } from '@openmsupply-client/common';
import { useOutboundApi } from '../utils/useOutboundApi';

export const useOutboundCounts = () => {
  const api = useOutboundApi();

  return useQuery(api.keys.count(), api.dashboard.shipmentCount, {
    retry: false,
    onError: () => {},
  });
};
