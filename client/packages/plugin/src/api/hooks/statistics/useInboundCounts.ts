import { useQuery } from '@openmsupply-client/common';
import { useDashboardApi } from '../utils/useDashboardApi';

export const useInboundCounts = () => {
  const api = useDashboardApi();

  return useQuery(api.keys.inbound(), api.get.inboundShipmentCounts, {
    retry: false,
    onError: () => {},
  });
};
