import { Formatter, useQuery } from '@openmsupply-client/common';
import { useRequestRequistionGraphql } from '../useRequestRequistionGraphql';
import { RECENT_STOCKTAKES } from './keys';

export const useRecentStocktakes = (
  enabled: boolean,
  maxAgeInDays?: number
) => {
  const { api, storeId } = useRequestRequistionGraphql();

  const startDate = Formatter.naiveDate(
    maxAgeInDays
      ? new Date(Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000)
      : undefined
  );

  const queryFn = async () => {
    const result = await api.recentStocktakeItems({
      storeId,
      startDate: startDate ?? '',
    });

    if (result.stocktakes.__typename === 'StocktakeConnector') {
      return result.stocktakes;
    }
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: [RECENT_STOCKTAKES, storeId, startDate],
    queryFn,
    enabled: !!startDate && enabled,
  });

  return {
    query: { data: data?.nodes ?? [], isLoading, isError },
  };
};
