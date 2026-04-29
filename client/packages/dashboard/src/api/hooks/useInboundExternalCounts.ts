import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, INBOUND } from './keys';
import { useApi } from './useApi';

export const useInboundExternalCounts = (enabled = true) => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery(
    [DASHBOARD, INBOUND, 'external', storeId],
    () =>
      api.inboundExternalCounts({
        storeId,
      }),
    {
      retry: false,
      enabled,
    }
  );

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
