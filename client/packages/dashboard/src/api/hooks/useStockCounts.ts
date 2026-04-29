import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, STOCK } from './keys';
import { useApi } from './useApi';

export const useStockCounts = (daysTillExpired: number) => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery(
    [DASHBOARD, STOCK, storeId],
    () =>
      api.stockCounts({
        storeId,
        daysTillExpired,
      }),
    {
      retry: false,
      // Silent on error — the dashboard widget shows its own empty state
      // when the user lacks permission; the page-level query has already
      // informed them.
      onError: () => {},
    }
  );

  if (!data?.stockCounts) {
    return { stats: undefined, ...rest };
  }

  const stats = data.stockCounts;

  return { stats, ...rest };
};
