import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, INBOUND } from './keys';
import { useApi } from './useApi';

export const useInboundExternalCounts = () => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery({
    queryKey: [DASHBOARD, INBOUND, 'external', storeId],
    queryFn: () =>
      api.inboundExternalCounts({
        storeId,
      }),
    retry: false,
  });

  if (!data?.inboundShipmentExternalCounts) {
    return { stats: undefined, ...rest };
  }

  const stats = {
    today: data.inboundShipmentExternalCounts.created.today,
    thisWeek: data.inboundShipmentExternalCounts.created.thisWeek,
    notDelivered: data.inboundShipmentExternalCounts.notDelivered,
  };

  return { stats, ...rest };
};
