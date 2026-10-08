import { useQuery } from '@openmsupply-client/common';
import { useDashboardApi } from '../utils/useDashboardApi';

export const useInboundCounts = () => {
  const api = useDashboardApi();

  return useQuery({
    queryKey: api.keys.inbound(),
    queryFn: api.get.inboundShipmentCounts,
    retry: false,
  });
};
