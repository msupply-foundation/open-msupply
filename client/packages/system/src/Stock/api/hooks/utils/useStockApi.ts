import {
  FilterByWithBoolean,
  SortBy,
  StockLineNode,
  useAuthContext,
  useGql,
} from '@openmsupply-client/common';
import { getSdk, StockLineRowFragment } from '../../operations.generated';
import { getStockQueries } from '../../api';
import { STOCK_LINE } from '../keys';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<StockLineRowFragment>;
  filterBy: FilterByWithBoolean | null;
};

export const useStockApi = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getStockQueries(getSdk(client), storeId);
  const keys = {
    base: () => [STOCK_LINE] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<StockLineNode>) =>
      [...keys.list(), sortBy] as const,
    repack: (invoiceId: string) => [...keys.base(), invoiceId] as const,
    listRepackByStockLine: (stockLineId: string) =>
      [...keys.base(), storeId, stockLineId] as const,
  };

  return { ...queries, keys, storeId };
};
