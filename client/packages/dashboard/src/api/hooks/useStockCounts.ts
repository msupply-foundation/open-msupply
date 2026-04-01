import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, STOCK } from './keys';
import { useApi } from './useApi';

export const useStockCounts = (daysTillExpired: number) => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery({
    queryKey: [DASHBOARD, STOCK, storeId],

    queryFn: () =>
      api.stockCounts({
        storeId,
        daysTillExpired,
      }),

    retry: false
  });

  if (!data?.stockCounts) {
    return { stats: undefined, ...rest };
  }

  const stats = data.stockCounts;

  return { stats, ...rest };
};
