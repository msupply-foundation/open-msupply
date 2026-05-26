import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, INBOUND } from './keys';
import { useApi } from './useApi';

export const useOutboundCounts = () => {
  const { storeId, api } = useApi();

  // Uses the same query key as useInboundCounts so both hooks deduplicate to
  // one HTTP request. The combined operation fetches all invoice count fields.
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

  if (!data?.invoiceCounts) {
    return { stats: undefined, ...rest };
  }

  const stats = {
    notShipped: data.invoiceCounts.outbound.notShipped,
  };

  return { stats, ...rest };
};
