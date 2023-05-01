import {
  FilterBy,
  SortBy,
  StockLineNode,
  useAuthContext,
  useGql,
} from '@openmsupply-client/common';
import { getSdk, StockLineRowFragment } from '../../operations.generated';
import { getStockQueries } from '../../api';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<StockLineRowFragment>;
  filterBy: FilterBy | null;
};

export const useStockApi = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getStockQueries(getSdk(client), storeId);
  const keys = {
    base: () => ['stock'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<StockLineNode>) =>
      [...keys.list(), sortBy] as const,
  };

  return { ...queries, keys, storeId };
};
