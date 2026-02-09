import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, INBOUND } from './keys';
import { useApi } from './useApi';

export const useInboundCounts = () => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery(
    [DASHBOARD, INBOUND, storeId],
    () =>
      api.inboundCounts({
        storeId,
      }),
    {
      retry: false,
    }
  );

  if (!data) {
    return { stats: undefined, ...rest };
  }

  const stats = {
    today: data.invoiceCounts.inbound.created.today,
    thisWeek: data.invoiceCounts.inbound.created.thisWeek,
    notDelivered: data.invoiceCounts.inbound.notDelivered,
  };

  return { stats, ...rest };
};
