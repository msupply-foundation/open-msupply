import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, INBOUND } from './keys';
import { useApi } from './useApi';

export const useInboundExternalCounts = () => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery(
    [DASHBOARD, INBOUND, 'external', storeId],
    () =>
      api.inboundExternalCounts({
        storeId,
      }),
    {
      retry: false,
    }
  );

  if (!data?.invoiceCounts?.inboundExternal) {
    return { stats: undefined, ...rest };
  }

  const stats = {
    today: data.invoiceCounts.inboundExternal.created.today,
    thisWeek: data.invoiceCounts.inboundExternal.created.thisWeek,
    notDelivered: data.invoiceCounts.inboundExternal.notDelivered,
  };

  return { stats, ...rest };
};
