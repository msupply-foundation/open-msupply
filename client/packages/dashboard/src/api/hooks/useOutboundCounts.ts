import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, OUTBOUND } from './keys';
import { useApi } from './useApi';

export const useOutboundCounts = () => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery({
    queryKey: [DASHBOARD, OUTBOUND, storeId],

    queryFn: () =>
      api.outboundCounts({
        storeId,
      }),

    retry: false
  });

  if (!data?.outboundShipmentCounts) {
    return { stats: undefined, ...rest };
  }

  const stats = {
    notShipped: data.outboundShipmentCounts.notShipped,
  };

  return { stats, ...rest };
};
