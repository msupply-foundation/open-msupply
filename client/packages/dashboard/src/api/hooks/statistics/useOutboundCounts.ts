import { useQuery } from '@openmsupply-client/common';
import { useDashboardApi } from '../utils/useDashboardApi';

export const useOutboundCounts = () => {
  const api = useDashboardApi();

  return useQuery(api.keys.outbound(), api.get.outboundShipmentCounts, {
    retry: false,
    onError: () => {},
  });
};
