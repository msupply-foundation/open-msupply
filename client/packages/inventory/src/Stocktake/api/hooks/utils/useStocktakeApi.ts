import { useGql, useAuthContext, SortBy } from '@openmsupply-client/common';
import { getStocktakeQueries, LinesParams, ListParams } from '../../api';
import { getSdk, StocktakeRowFragment } from '../../operations.generated';

export const useStocktakeApi = () => {
  const keys = {
    base: () => ['stocktake'] as const,
    detail: (number: string) => [...keys.base(), storeId, number] as const,
    lines: (number: string, params: LinesParams) =>
      [...keys.detail(number), 'lines', params] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<StocktakeRowFragment>) =>
      [...keys.list(), sortBy] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getStocktakeQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};
