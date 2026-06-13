import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { StockLineSortFieldInput } from '@/gql/schema';
import { stockSdk } from './api';

export interface StockListParams {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDesc: boolean;
}

// Column id -> server sort field. Columns absent here aren't server-sortable.
const SORT_FIELD: Record<string, StockLineSortFieldInput> = {
  code: StockLineSortFieldInput.ItemCode,
  name: StockLineSortFieldInput.ItemName,
  batch: StockLineSortFieldInput.Batch,
  expiryDate: StockLineSortFieldInput.ExpiryDate,
  packSize: StockLineSortFieldInput.PackSize,
  totalNumberOfPacks: StockLineSortFieldInput.NumberOfPacks,
  supplierName: StockLineSortFieldInput.SupplierName,
};

const toSortField = (key: string): StockLineSortFieldInput =>
  SORT_FIELD[key] ?? StockLineSortFieldInput.ItemName;

// Query keys are rooted under storeId so switching store auto-segments the cache.
export const stockKeys = {
  all: (storeId: string) => ['stock', storeId] as const,
  list: (storeId: string, params: StockListParams) =>
    [...stockKeys.all(storeId), 'list', params] as const,
  detail: (storeId: string, id: string) =>
    [...stockKeys.all(storeId), 'detail', id] as const,
};

export const stockListQueryOptions = (
  storeId: string,
  params: StockListParams,
) =>
  queryOptions({
    queryKey: stockKeys.list(storeId, params),
    queryFn: async () => {
      const res = await stockSdk.stockLines({
        storeId,
        first: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
        key: toSortField(params.sortKey),
        desc: params.sortDesc,
        filter: { hasPacksInStore: true },
      });
      return res.stockLines;
    },
    placeholderData: keepPreviousData,
  });

export const stockLineQueryOptions = (storeId: string, id: string) =>
  queryOptions({
    queryKey: stockKeys.detail(storeId, id),
    queryFn: async () => {
      const res = await stockSdk.stockLine({ storeId, id });
      return res.stockLines.nodes[0] ?? null;
    },
  });
