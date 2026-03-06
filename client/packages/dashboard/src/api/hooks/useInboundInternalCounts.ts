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

  if (!data?.invoiceCounts?.inboundInternal) {
    return { stats: undefined, ...rest };
  }

  const stats = {
    today: data.invoiceCounts.inboundInternal.created.today,
    thisWeek: data.invoiceCounts.inboundInternal.created.thisWeek,
    notDelivered: data.invoiceCounts.inboundInternal.notDelivered,
  };

  return { stats, ...rest };
};
