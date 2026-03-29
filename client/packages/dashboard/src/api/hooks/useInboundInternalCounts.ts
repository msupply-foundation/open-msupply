import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, INBOUND } from './keys';
import { useApi } from './useApi';

export const useInboundInternalCounts = () => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery(
    [DASHBOARD, INBOUND, 'internal', storeId],
    () =>
      api.inboundInternalCounts({
        storeId,
      }),
    {
      retry: false,
    }
  );

  if (!data?.inboundShipmentCounts) {
    return { stats: undefined, ...rest };
  }

  const stats = {
    today: data.inboundShipmentCounts.created.today,
    thisWeek: data.inboundShipmentCounts.created.thisWeek,
    notDelivered: data.inboundShipmentCounts.notDelivered,
  };

  return { stats, ...rest };
};
