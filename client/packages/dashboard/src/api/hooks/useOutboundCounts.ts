import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, OUTBOUND } from './keys';
import { useApi } from './useApi';

export const useOutboundCounts = () => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery(
    [DASHBOARD, OUTBOUND, storeId],
    () =>
      api.outboundCounts({
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
    notShipped: data.invoiceCounts.outbound.notShipped,
  };

  return { stats, ...rest };
};
