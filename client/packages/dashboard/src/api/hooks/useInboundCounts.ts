import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, INBOUND } from './keys';
import { useApi } from './useApi';

export const useInboundCounts = () => {
  const { storeId, api } = useApi();

  // Shares query key with useOutboundCounts so both hooks deduplicate to one
  // HTTP request via react-query caching.
  const { data, ...rest } = useQuery(
    [DASHBOARD, INBOUND, storeId],
    () =>
      api.dashboardInvoiceCounts({
        storeId,
      }),
    {
      enabled: !!storeId,
      retry: false,
    }
  );

  if (!data?.invoiceCounts?.inbound) {
    return { stats: undefined, ...rest };
  }

  const stats = {
    today: data.invoiceCounts.inbound.created.today,
    thisWeek: data.invoiceCounts.inbound.created.thisWeek,
    notDelivered: data.invoiceCounts.inbound.notDelivered,
  };

  return { stats, ...rest };
};
