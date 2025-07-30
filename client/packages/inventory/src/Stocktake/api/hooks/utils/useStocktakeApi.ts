import { useGql, useAuthContext, SortBy } from '@openmsupply-client/common';
import { getStocktakeQueries, LinesParams, ListParams } from '../../api';
import { getSdk, StocktakeRowFragment } from '../../operations.generated';

export const useStocktakeApi = () => {
  const keys = {
    base: () => ['stocktake'] as const,
    detail: (stocktakeId: string) =>
      [...keys.base(), storeId, stocktakeId] as const,
    lines: (stocktakeId: string, params: LinesParams) =>
      [...keys.detail(stocktakeId), 'lines', params] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<StocktakeRowFragment>) =>
      [...keys.list(), sortBy] as const,
    hasStocktake: () => [...keys.base(), storeId, 'hasStocktake'] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getStocktakeQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};
